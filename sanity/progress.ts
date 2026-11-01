import 'server-only'

import { defineQuery } from 'next-sanity'

import { EMPTY_PROGRESS, progressDocId, type CourseProgress } from '@/lib/progress'

import { client } from './lib/client'

const PROGRESS_QUERY = defineQuery(`
  *[_id == $id][0] {
    "lessons": lessons[] { "id": lesson._ref, position, duration, completed },
    "lastLessonId": lastLesson._ref,
    lastPosition
  }
`)

/**
 * One learner's progress in one course. Called only from the /api/progress route
 * handler, which takes `userId` from the Clerk session. Per-user, never cached.
 */
export async function readCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
  const doc = await client.fetch(PROGRESS_QUERY, { id: progressDocId(userId, courseId) }, { cache: 'no-store' })
  if (!doc) return EMPTY_PROGRESS

  return {
    lessons: Object.fromEntries(
      (doc.lessons ?? []).map((l) => [
        l.id,
        { position: l.position ?? 0, duration: l.duration ?? 0, completed: Boolean(l.completed) },
      ]),
    ),
    lastLessonId: doc.lastLessonId ?? null,
    lastPosition: doc.lastPosition ?? 0,
  }
}

const COURSE_PERCENTS_QUERY = defineQuery(`
  *[_type == "progress" && userId == $userId && defined(course->_id)] {
    "courseId": course._ref,
    "done": lessons[completed == true].lesson._ref,
    "lessonIds": course->modules[].lessons[]._ref
  }
`)

/**
 * The learner's % complete per started course ({ courseId: percent }), for catalog cards.
 * Called only from GET /api/progress/courses with `userId` from the Clerk session.
 */
export async function readCoursePercents(userId: string): Promise<Record<string, number>> {
  const docs = await client.fetch(COURSE_PERCENTS_QUERY, { userId }, { cache: 'no-store' })
  const percents: Record<string, number> = {}
  for (const doc of docs) {
    const all = (doc.lessonIds ?? []).filter(Boolean)
    if (!doc.courseId || all.length === 0) continue
    const done = new Set(doc.done ?? [])
    percents[doc.courseId] = Math.round((all.filter((id) => done.has(id)).length / all.length) * 100)
  }
  return percents
}

const SETTINGS_DATA_QUERY = defineQuery(`{
  "courses": *[_type == "progress" && userId == $userId && defined(course->_id)] | order(updatedAt desc) {
    "courseId": course._ref,
    "title": course->title,
    "lessonsTracked": count(lessons)
  },
  "bookmarkCount": count(*[_id == $bookmarksId][0].items)
}`)

/** For Settings → Your data: the learner's tracked courses and saved-item count. */
export async function readSettingsData(userId: string) {
  const data = await client.fetch(
    SETTINGS_DATA_QUERY,
    { userId, bookmarksId: `bookmarks.${userId}` },
    { cache: 'no-store' },
  )
  return { courses: data.courses ?? [], bookmarkCount: data.bookmarkCount ?? 0 }
}
