import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import type { ClientReturn, QueryParams } from 'next-sanity'

import { client } from './client'

/**
 * Cached, server-only Sanity read. Tag with the document types the query
 * touches so a revalidation webhook can call `revalidateTag(type)` later.
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
  tags,
}: {
  query: QueryString
  params?: QueryParams
  tags: string[]
}): Promise<ClientReturn<QueryString>> {
  'use cache'
  cacheLife('minutes')
  cacheTag(...tags)
  return client.fetch<ClientReturn<QueryString>>(query, params)
}
