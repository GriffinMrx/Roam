import 'server-only'

import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'
import { token } from './token'

// The dataset is private: reads always carry the token and never run in the browser.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false, // Responses are cached by Next.js ('use cache' in ./fetch)
  perspective: 'published',
})
