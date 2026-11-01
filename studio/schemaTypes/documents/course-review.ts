import {ClipboardIcon} from '@sanity/icons/Clipboard'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Review of a teacher-made course (the course itself lives in the web app's Neon database).
 * Created and refreshed by the web app's server when a teacher submits; the decision
 * (status + note) is made here, in the Course Review tool or this form, and the site shows
 * the course only while status is "approved". Id `courseReview.<courseId>`.
 */
export const REVIEW_STATUSES = [
  {title: 'Pending review', value: 'pending'},
  {title: 'Approved (live)', value: 'approved'},
  {title: 'Changes requested', value: 'changesRequested'},
  {title: 'Unpublished', value: 'unpublished'},
]

export const courseReview = defineType({
  name: 'courseReview',
  title: 'Course Review',
  type: 'document',
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: 'status',
      type: 'string',
      options: {list: REVIEW_STATUSES, layout: 'radio'},
      initialValue: 'pending',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Note for the teacher',
      description: 'Required when requesting changes or unpublishing. The teacher sees it in their course list.',
      type: 'text',
      rows: 3,
      validation: (rule) =>
        rule.custom((note, context) => {
          const status = (context.document as {status?: string} | undefined)?.status
          return (status === 'changesRequested' || status === 'unpublished') && !note?.trim()
            ? 'Tell the teacher what to change'
            : true
        }),
    }),
    defineField({name: 'decidedAt', type: 'datetime', readOnly: true}),
    defineField({name: 'title', type: 'string', readOnly: true}),
    defineField({name: 'summary', type: 'text', rows: 2, readOnly: true}),
    defineField({name: 'courseId', title: 'Course ID (web app)', type: 'string', readOnly: true}),
    defineField({name: 'courseSlug', type: 'string', readOnly: true}),
    defineField({name: 'teacherName', type: 'string', readOnly: true}),
    defineField({name: 'teacherSlug', type: 'string', readOnly: true}),
    defineField({name: 'categoryTitle', type: 'string', readOnly: true}),
    defineField({name: 'level', type: 'string', readOnly: true}),
    defineField({name: 'price', description: 'USD; 0 is free', type: 'number', readOnly: true}),
    defineField({name: 'lessonCount', type: 'number', readOnly: true}),
    defineField({name: 'durationSeconds', type: 'number', readOnly: true}),
    defineField({name: 'submittedAt', type: 'datetime', readOnly: true}),
    defineField({
      name: 'outline',
      description: 'Snapshot of the course taken when it was last submitted.',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          name: 'reviewModule',
          type: 'object',
          fields: [
            defineField({name: 'title', type: 'string'}),
            defineField({
              name: 'lessons',
              type: 'array',
              of: [
                defineArrayMember({
                  name: 'reviewLesson',
                  type: 'object',
                  fields: [
                    defineField({name: 'title', type: 'string'}),
                    defineField({name: 'durationSeconds', type: 'number'}),
                    defineField({name: 'videoUrl', type: 'url'}),
                    defineField({name: 'freePreview', type: 'boolean'}),
                  ],
                  preview: {select: {title: 'title', subtitle: 'videoUrl'}},
                }),
              ],
            }),
          ],
          preview: {select: {title: 'title'}},
        }),
      ],
    }),
  ],
  orderings: [
    {title: 'Submitted, newest first', name: 'submittedDesc', by: [{field: 'submittedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', teacher: 'teacherName', status: 'status'},
    prepare: ({title, teacher, status}) => ({
      title: title ?? 'Untitled course',
      subtitle: `${REVIEW_STATUSES.find((s) => s.value === status)?.title ?? status} · ${teacher ?? 'Unknown teacher'}`,
    }),
  },
})
