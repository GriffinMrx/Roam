import {BookmarkIcon} from '@sanity/icons/Bookmark'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Learner bookmarks: app state, not authored content. Written only by the web app's
 * POST /api/bookmarks route (server-side, Clerk-authenticated). One document per
 * learner, id `bookmarks.<clerkUserId>`. Read-only here and not listed in the desk structure.
 */
export const bookmarks = defineType({
  name: 'bookmarks',
  title: 'Learner Bookmarks',
  type: 'document',
  icon: BookmarkIcon,
  readOnly: true,
  fields: [
    defineField({name: 'userId', title: 'Clerk User ID', type: 'string'}),
    defineField({
      name: 'items',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'bookmark',
          type: 'object',
          fields: [
            defineField({name: 'kind', type: 'string', options: {list: ['course', 'lesson']}}),
            defineField({
              name: 'ref',
              type: 'reference',
              to: [{type: 'course'}, {type: 'lesson'}],
              weak: true,
            }),
            defineField({name: 'savedAt', type: 'datetime'}),
          ],
        }),
      ],
    }),
    defineField({name: 'updatedAt', type: 'datetime'}),
  ],
  preview: {select: {title: 'userId'}},
})
