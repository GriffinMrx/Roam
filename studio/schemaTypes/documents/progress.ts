import {ChartUpwardIcon} from '@sanity/icons/ChartUpward'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Learner progress: app state, not authored content. Written only by the web app's
 * POST /api/progress route (server-side, Clerk-authenticated). One document per
 * learner per course, id `progress.<clerkUserId>.<courseSlugId>`. Read-only here and
 * not listed in the desk structure.
 */
export const progress = defineType({
  name: 'progress',
  title: 'Learner Progress',
  type: 'document',
  icon: ChartUpwardIcon,
  readOnly: true,
  fields: [
    defineField({name: 'userId', title: 'Clerk User ID', type: 'string'}),
    defineField({name: 'course', type: 'reference', to: [{type: 'course'}], weak: true}),
    defineField({
      name: 'lessons',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'lessonProgress',
          type: 'object',
          fields: [
            defineField({name: 'lesson', type: 'reference', to: [{type: 'lesson'}], weak: true}),
            defineField({name: 'position', description: 'Seconds', type: 'number'}),
            defineField({name: 'duration', description: 'Seconds', type: 'number'}),
            defineField({name: 'completed', type: 'boolean'}),
            defineField({name: 'completedAt', type: 'datetime'}),
            defineField({name: 'updatedAt', type: 'datetime'}),
          ],
        }),
      ],
    }),
    defineField({name: 'lastLesson', type: 'reference', to: [{type: 'lesson'}], weak: true}),
    defineField({name: 'lastPosition', description: 'Seconds', type: 'number'}),
    defineField({name: 'updatedAt', type: 'datetime'}),
  ],
  preview: {select: {title: 'userId', subtitle: 'course.title'}},
})
