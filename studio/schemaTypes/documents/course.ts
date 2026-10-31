import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const LEVELS = [
  {title: 'Beginner', value: 'beginner'},
  {title: 'Intermediate', value: 'intermediate'},
  {title: 'Advanced', value: 'advanced'},
]

export const course = defineType({
  name: 'course',
  type: 'document',
  icon: BookIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'marketing', title: 'Marketing'},
    {name: 'curriculum', title: 'Curriculum'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: 'coverImage',
      description: 'Square course mark, shown on cards, the course page, and search results',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alternative Text', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'level',
      type: 'string',
      group: 'content',
      options: {list: LEVELS, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'instructor',
      type: 'reference',
      group: 'content',
      to: [{type: 'instructor'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'reference',
      group: 'content',
      to: [{type: 'category'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      description: 'In USD. Use 0 for a free course.',
      type: 'number',
      group: 'marketing',
      initialValue: 0,
      validation: (rule) => rule.min(0).precision(2),
    }),
    defineField({
      name: 'popular',
      description: 'Shows the Popular badge',
      type: 'boolean',
      group: 'marketing',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      description: 'Display only',
      type: 'number',
      group: 'marketing',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'outcomes',
      title: 'What you’ll learn',
      type: 'array',
      group: 'marketing',
      of: [defineArrayMember({type: 'outcome'})],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'modules',
      type: 'array',
      group: 'curriculum',
      of: [defineArrayMember({type: 'module'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', level: 'level', media: 'coverImage', modules: 'modules'},
    prepare({title, level, media, modules}) {
      const count = Array.isArray(modules) ? modules.length : 0
      return {
        title,
        subtitle: [level, `${count} module${count === 1 ? '' : 's'}`].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
