import 'server-only'

import type { ClientReturn, QueryParams } from 'next-sanity'

import { cachedSanityFetch } from './live'

/**
 * Cached, server-only read of published content. Results are tagged with
 * Sanity's sync tags, so <SanityLive /> refreshes exactly the queries whose
 * content changed, without a reload.
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
}: {
  query: QueryString
  params?: QueryParams
}): Promise<ClientReturn<QueryString>> {
  const { data } = await cachedSanityFetch({ query, params, perspective: 'published', stega: false })
  return data as ClientReturn<QueryString>
}
