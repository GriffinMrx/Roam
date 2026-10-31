import 'server-only'

import { defineQuery } from 'next-sanity'

import { client } from './lib/client'

/*
 * Learner bookmarks: app state, one document per learner (`bookmarks.<userId>`), kept
 * apart from content. Written only by POST /api/bookmarks. `userId` must come from the
 * Clerk session. Per-user, so never cached.
 */

export const BOOKMARK_ID = /^(course|lesson)\.[a-z0-9-]{1,120}$/

export function bookmarksDocId(userId: string) {
  return `bookmarks.${userId}`
}

const BOOKMARK_IDS_QUERY = defineQuery(`
  *[_id == $id][0].items[].ref._ref
`)

/** The ids (course.… / lesson.…) the learner has saved. */
export async function readBookmarkIds(userId: string): Promise<string[]> {
  const ids = await client.fetch(BOOKMARK_IDS_QUERY, { id: bookmarksDocId(userId) }, { cache: 'no-store' })
  return (ids ?? []).filter((id): id is string => typeof id === 'string')
}

const SAVED_QUERY = defineQuery(`
  *[_id == $id][0] {
    "courses": items[kind == "course" && defined(ref->slug.current)] | order(savedAt desc) {
      "course": ref->{
        _id,
        title,
        "slug": slug.current,
        summary,
        coverImage,
        level,
        "moduleCount": count(modules),
        "durationSeconds": math::sum(modules[].lessons[]->duration)
      }
    }.course,
    "lessons": items[kind == "lesson" && defined(ref->slug.current)] | order(savedAt desc) {
      "lesson": ref->{
        _id,
        title,
        "slug": slug.current,
        "durationSeconds": duration,
        freePreview,
        "course": *[_type == "course" && references(^._id)][0] {
          title,
          coverImage,
          "modules": modules[] { "lessonIds": lessons[]._ref }
        }
      }
    }.lesson
  }
`)

/** The learner's saved courses and lessons, newest first, for My Learning. */
export async function readSaved(userId: string) {
  const doc = await client.fetch(SAVED_QUERY, { id: bookmarksDocId(userId) }, { cache: 'no-store' })
  return { courses: doc?.courses ?? [], lessons: doc?.lessons ?? [] }
}
