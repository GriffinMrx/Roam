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
