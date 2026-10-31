import 'server-only'

import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

const writeToken = process.env.SANITY_API_WRITE_TOKEN

/**
 * Server-only client with write access. Used solely by POST /api/progress to save
 * learner progress; the browser never writes to Sanity (AGENTS §5, §12).
 */
export function getWriteClient() {
  if (!writeToken) throw new Error('Missing environment variable: SANITY_API_WRITE_TOKEN')
  return createClient({ projectId, dataset, apiVersion, token: writeToken, useCdn: false, perspective: 'raw' })
}
