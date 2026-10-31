import 'server-only'

import { defineQuery } from 'next-sanity'

import { client } from './lib/client'

/*
 * Free-preview lessons can be watched without signing in (the proxy lets them through).
 * The slug set is cached in memory briefly; on failure, callers treat lessons as gated.
 */

const FREE_LESSON_SLUGS_QUERY = defineQuery(`
  *[_type == "lesson" && freePreview == true && defined(slug.current)].slug.current
`)

const TTL_MS = 5 * 60 * 1000
let cache: { slugs: Set<string>; expires: number } | null = null

export async function isFreePreviewLesson(slug: string): Promise<boolean> {
  if (!cache || cache.expires < Date.now()) {
    try {
      const slugs = await client.fetch(FREE_LESSON_SLUGS_QUERY, {}, { cache: 'no-store' })
      cache = { slugs: new Set(slugs ?? []), expires: Date.now() + TTL_MS }
    } catch {
      return false // fail closed: the lesson stays gated
    }
  }
  return cache.slugs.has(slug)
}
