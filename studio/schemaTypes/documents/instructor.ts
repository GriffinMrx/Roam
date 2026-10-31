import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

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
      description: 'Short role line, e.g. "Senior Frontend Engineer at Acme"',
      type: 'string',
    }),
    defineField({name: 'bio', type: 'text', rows: 5}),
  ],
  preview: {select: {title: 'name', subtitle: 'expertise', media: 'photo'}},
})
