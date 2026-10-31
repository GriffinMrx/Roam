import 'server-only'

import { defineQuery } from 'next-sanity'

import { formatDuration, formatLevel } from '@/lib/format'
import {
  completedLessonIds,
  coursePercent,
  resumeTarget,
  type CourseProgress,
} from '@/lib/progress'
import { parseVideoUrl, youtubeThumbnail } from '@/lib/video'

import { client } from './lib/client'
import { urlFor } from './lib/image'

/*
 * The signed-in learner's My Learning dashboard, built from their progress documents.
 * `userId` must come from the Clerk session (never from the request). Per-user, so
 * never cached. Only display fields leave this module.
 */

const MY_PROGRESS_QUERY = defineQuery(`
  *[_type == "progress" && userId == $userId && defined(course->_id)] | order(updatedAt desc) {
    _id,
    "lessons": lessons[] { "id": lesson._ref, position, duration, completed },
    "lastLessonId": lastLesson._ref,
    lastPosition,
    "course": course->{
      _id,
      title,
      "slug": slug.current,
      coverImage,
      level,
      modules[] {
        _key,
        title,
        "lessons": lessons[]->{
          _id,
          title,
          "slug": slug.current,
          "durationSeconds": duration,
          thumbnail,
          videoUrl
        }
      }
    }
  }
`)

export type ContinueLesson = {
  courseTitle: string
  label: string
  title: string
  href: string
  posterUrl?: string
  position: number
  duration: number
}

export type LearningCourse = {
  id: string
  title: string
  href: string
  coverUrl?: string
  /** 16:9 cover for cover-style cards. */
  coverWideUrl?: string
  level: string
  percent: number
  moduleLabel: string
  continueHref: string
}

export type MyLearning = {
  hero: ContinueLesson | null
  stats: { lessonsCompleted: number; coursesFinished: number; timeWatched: string }
  inProgress: LearningCourse[]
  completed: LearningCourse[]
}

export async function getMyLearning(userId: string): Promise<MyLearning> {
  const docs = await client.fetch(MY_PROGRESS_QUERY, { userId }, { cache: 'no-store' })

  let lessonsCompleted = 0
  let secondsWatched = 0
  let hero: ContinueLesson | null = null
  const inProgress: LearningCourse[] = []
  const completed: LearningCourse[] = []

  for (const doc of docs) {
    const course = doc.course
    if (!course?.slug) continue

    const entries = doc.lessons ?? []
    const progress: CourseProgress = {
      lessons: Object.fromEntries(
        entries
          .filter((l) => l.id)
          .map((l) => [l.id as string, { position: l.position ?? 0, duration: l.duration ?? 0, completed: Boolean(l.completed) }]),
      ),
      lastLessonId: doc.lastLessonId ?? null,
      lastPosition: doc.lastPosition ?? 0,
    }
    // Started: at least one lesson finished or partly watched.
    const started = Object.values(progress.lessons).some((l) => l.completed || l.position > 0)
    if (!started) continue

    for (const l of Object.values(progress.lessons)) {
      if (l.completed) lessonsCompleted++
      secondsWatched += l.completed ? l.duration : l.position
    }

    const modules = (course.modules ?? []).map((m) => ({
      key: m._key,
      lessons: (m.lessons ?? []).filter((l): l is NonNullable<typeof l> => Boolean(l?._id && l.slug)),
    }))
    const shape = { modules: modules.map((m) => ({ key: m.key, lessonIds: m.lessons.map((l) => l._id) })) }
    const done = completedLessonIds(progress)
    const percent = coursePercent(shape, done)
    const target = resumeTarget(shape, progress)

    // Where the resume target sits: "Module 3 of 6", "Lesson 3.2".
    const moduleIndex = Math.max(0, modules.findIndex((m) => m.lessons.some((l) => l._id === target.lessonId)))
    const lessonIndex = modules[moduleIndex]?.lessons.findIndex((l) => l._id === target.lessonId) ?? -1
    const lesson = lessonIndex >= 0 ? modules[moduleIndex].lessons[lessonIndex] : undefined
    const continueHref = lesson
      ? `/lessons/${lesson.slug}${target.position > 0 ? `?t=${target.position}` : ''}`
      : `/courses/${course.slug}`

    const coverUrl = course.coverImage?.asset
      ? urlFor(course.coverImage).width(128).height(128).fit('crop').url()
      : undefined

    const item: LearningCourse = {
      id: course._id,
      title: course.title ?? '',
      href: `/courses/${course.slug}`,
      coverUrl,
      coverWideUrl: course.coverImage?.asset
        ? urlFor(course.coverImage).width(800).height(450).fit('crop').url()
        : undefined,
      level: formatLevel(course.level),
      percent,
      moduleLabel: `Module ${moduleIndex + 1} of ${modules.length}`,
      continueHref,
    }

    if (percent === 100) {
      completed.push(item)
      continue
    }
    inProgress.push(item)

    // Docs are newest first, so the first unfinished course is the hero.
    if (!hero && lesson) {
      const video = parseVideoUrl(lesson.videoUrl)
      const posterUrl = lesson.thumbnail?.asset
        ? urlFor(lesson.thumbnail).width(960).height(540).fit('crop').url()
        : video?.provider === 'youtube'
          ? youtubeThumbnail(video.id)
          : course.coverImage?.asset
            ? urlFor(course.coverImage).width(960).height(540).fit('crop').url()
            : undefined
      hero = {
        courseTitle: course.title ?? '',
        label: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}`,
        title: lesson.title ?? '',
        href: continueHref,
        posterUrl,
        position: target.position,
        duration: lesson.durationSeconds ?? progress.lessons[lesson._id]?.duration ?? 0,
      }
    }
  }

  return {
    hero,
    stats: { lessonsCompleted, coursesFinished: completed.length, timeWatched: formatDuration(secondsWatched) },
    inProgress,
    completed,
  }
}
