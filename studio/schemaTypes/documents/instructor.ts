import {UserIcon} from '@sanity/icons/User'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const instructor = defineType({
  name: 'instructor',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alternative Text', type: 'string'})],
    }),
    defineField({
      name: 'expertise',
      description: 'Topics this instructor teaches, e.g. React, Next.js',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
    defineField({name: 'bio', type: 'blockContent'}),
  ],
  preview: {
    select: {title: 'name', expertise: 'expertise', media: 'photo'},
    prepare({title, expertise, media}) {
      return {title, subtitle: Array.isArray(expertise) ? expertise.join(', ') : undefined, media}
    },
  },
})
