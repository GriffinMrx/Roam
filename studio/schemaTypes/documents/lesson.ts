import {PlayIcon} from '@sanity/icons/Play'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** Providers with both ingestion and an on-site embed. Keep in sync with the web app. */
const VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'iframe.mediadelivery.net',
  'player.mediadelivery.net',
]

function formatDuration(seconds?: number) {
  if (!seconds) return undefined
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

/**
 * A lesson does not store its course: derive it with
 * `*[_type == "course" && references(^._id)]`.
 */
export const lesson = defineType({
  name: 'lesson',
  type: 'document',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'video', title: 'Video'},
    {name: 'notes', title: 'Notes'},
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
      rows: 2,
      group: 'content',
      validation: (rule) => rule.max(240),
    }),
    defineField({
      name: 'freePreview',
      description: 'Label only, not access control',
      type: 'boolean',
      group: 'content',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      description: 'Display only',
      type: 'number',
      group: 'content',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      description: 'YouTube, Vimeo, or Bunny Stream URL',
      type: 'url',
      group: 'video',
      validation: (rule) =>
        rule
          .required()
          .uri({scheme: ['https']})
          .custom((value) => {
            if (!value) return true
            try {
              const host = new URL(value).hostname
              return VIDEO_HOSTS.includes(host) || 'Use a YouTube, Vimeo, or Bunny Stream URL'
            } catch {
              return 'Invalid URL'
            }
          }),
    }),
    defineField({
      name: 'durationSeconds',
      title: 'Duration (seconds)',
      type: 'number',
      group: 'video',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'thumbnail',
      type: 'image',
      group: 'video',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alternative Text', type: 'string'})],
    }),
    defineField({name: 'notes', type: 'blockContent', group: 'notes'}),
    defineField({
      name: 'keyPoints',
      title: 'In this lesson you will',
      type: 'array',
      group: 'notes',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.max(6),
    }),
    defineField({name: 'proTip', type: 'text', rows: 2, group: 'notes'}),
    defineField({
      name: 'resources',
      type: 'array',
      group: 'notes',
      of: [defineArrayMember({type: 'resource'})],
    }),
  ],
  preview: {
    select: {title: 'title', duration: 'durationSeconds', media: 'thumbnail', free: 'freePreview'},
    prepare({title, duration, media, free}) {
      return {
        title,
        subtitle: [formatDuration(duration), free && 'Free preview'].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
