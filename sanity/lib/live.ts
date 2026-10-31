import 'server-only'

import { defineLive, type StrictDefinedFetchType } from 'next-sanity/live'

import { client } from './client'
import { token } from './token'

/*
 * Sanity Live Content API. <SanityLive /> listens to the dataset's live event
 * stream in the browser and refreshes cached queries whose content changed.
 *
 * No browserToken: the site shows published content only, and the event stream
 * carries opaque sync tags (never content), so the browser needs no credentials.
 * Content is still fetched on the server with the server-only token.
 */
export const { sanityFetch: liveFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  strict: true,
})

/** The app's one shared 'use cache' boundary; liveFetch sets cache tags and lifetime inside it. */
export const cachedSanityFetch: StrictDefinedFetchType = async (options) => {
  'use cache'
  return liveFetch(options)
}
