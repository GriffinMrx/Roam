import {StackIcon} from '@sanity/icons/Stack'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A module is embedded in a course, not its own document.
 * "Module 5" / "Lesson 5.1" labels are derived from array order, never stored.
 */
export const courseModule = defineType({
  name: 'module',
  type: 'object',
  icon: StackIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'summary', type: 'text', rows: 2}),
    defineField({
      name: 'lessons',
      description: 'In teaching order. Every lesson should cover this module’s topic.',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'lesson'}]})],
      validation: (rule) => rule.required().min(1).unique(),
    }),
  ],
  preview: {
    select: {title: 'title', lessons: 'lessons'},
    prepare({title, lessons}) {
      const count = Array.isArray(lessons) ? lessons.length : 0
      return {title, subtitle: `${count} lesson${count === 1 ? '' : 's'}`}
    },
  },
})
