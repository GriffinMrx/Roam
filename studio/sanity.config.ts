import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {PostHogLayout, withPostHogDocumentAction} from './posthog-components'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {courseReviewTool} from './tools/course-review'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET
if (!projectId || !dataset) {
  throw new Error('Set SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET in studio/.env')
}

export default defineConfig({
  name: 'default',
  title: 'Roam',

  projectId,
  dataset,

  plugins: [structureTool({structure}), visionTool()],

  // Admin dashboard for teacher-made courses (prompts/onboarding-survey-review-and-phase-2.md)
  tools: (prev) => [...prev, courseReviewTool],

  studio: {
    components: {
      layout: PostHogLayout,
    },
  },

  document: {
    actions: (previousActions) => previousActions.map(withPostHogDocumentAction),
  },

  schema: {
    types: schemaTypes,
  },
})
