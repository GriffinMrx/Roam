import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {defineField, defineType} from 'sanity'

/** Icon keys the web app maps to glyphs. Add a key here and in the UI together. */
export const OUTCOME_ICONS = [
  {title: 'Layers', value: 'layers'},
  {title: 'Workflow', value: 'workflow'},
  {title: 'Gauge', value: 'gauge'},
  {title: 'Rocket', value: 'rocket'},
  {title: 'Sparkles', value: 'sparkles'},
  {title: 'Shield', value: 'shield'},
  {title: 'Puzzle', value: 'puzzle'},
  {title: 'Code', value: 'code'},
  {title: 'Database', value: 'database'},
  {title: 'Cloud', value: 'cloud'},
  {title: 'Book', value: 'book'},
]

/** A "What you'll learn" item on a course. */
export const learningOutcome = defineType({
  name: 'learningOutcome',
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      options: {list: OUTCOME_ICONS},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(160).warning('Keep it short for the card'),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'description'}},
})
