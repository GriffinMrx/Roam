import {ClipboardIcon} from '@sanity/icons/Clipboard'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Tab,
  TabList,
  Text,
  TextArea,
} from '@sanity/ui'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useClient, type Tool} from 'sanity'

/*
 * Course Review: the admin dashboard for teacher-made courses. Each course has one
 * `courseReview` document, created by the web app when the teacher submits. Approving here
 * sets status "approved", and the site shows the course within seconds (Sanity Live).
 * Writes use the signed-in Studio user's own permissions.
 */

type ReviewLesson = {_key: string; title?: string; durationSeconds?: number; videoUrl?: string; freePreview?: boolean}
type Review = {
  _id: string
  status: 'pending' | 'approved' | 'changesRequested' | 'unpublished'
  note?: string
  title?: string
  summary?: string
  courseSlug?: string
  teacherName?: string
  teacherSlug?: string
  categoryTitle?: string
  level?: string
  price?: number
  lessonCount?: number
  durationSeconds?: number
  submittedAt?: string
  decidedAt?: string
  outline?: {_key: string; title?: string; lessons?: ReviewLesson[]}[]
}

const QUERY = `*[_type == "courseReview"] | order(submittedAt desc) {
  _id, status, note, title, summary, courseSlug, teacherName, teacherSlug, categoryTitle, level,
  price, lessonCount, durationSeconds, submittedAt, decidedAt, outline
}`

const TABS: {key: Review['status']; label: string; tone: 'caution' | 'positive' | 'critical' | 'default'}[] = [
  {key: 'pending', label: 'Pending', tone: 'caution'},
  {key: 'approved', label: 'Approved', tone: 'positive'},
  {key: 'changesRequested', label: 'Changes requested', tone: 'critical'},
  {key: 'unpublished', label: 'Unpublished', tone: 'default'},
]

/** Where "View on site" links go; set SANITY_STUDIO_SITE_URL for the deployed Studio. */
const SITE_URL = (process.env.SANITY_STUDIO_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

function duration(seconds = 0) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

function youtubeId(url = '') {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match?.[1]
}

function CourseReviewTool() {
  const client = useClient({apiVersion: '2025-01-01'})
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [tab, setTab] = useState<Review['status']>('pending')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    client
      .fetch<Review[]>(QUERY)
      .then(setReviews)
      .catch((e: Error) => setError(e.message))
  }, [client])

  // Live: refetch whenever any review changes (a teacher submits, another admin decides).
  useEffect(() => {
    load()
    const subscription = client.listen('*[_type == "courseReview"]', {}, {visibility: 'query'}).subscribe(() => load())
    return () => subscription.unsubscribe()
  }, [client, load])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of reviews ?? []) out[r.status] = (out[r.status] ?? 0) + 1
    return out
  }, [reviews])

  const decide = useCallback(
    async (id: string, status: Review['status'], note?: string) => {
      setError(null)
      try {
        await client
          .patch(id)
          .set({status, decidedAt: new Date().toISOString(), ...(note !== undefined ? {note} : {})})
          .commit()
        load()
      } catch (e) {
        setError((e as Error).message)
      }
    },
    [client, load],
  )

  const visible = (reviews ?? []).filter((r) => r.status === tab)

  return (
    <Container width={3} padding={4} paddingTop={5}>
      <Stack gap={4}>
        <Stack gap={3}>
          <Heading size={3}>Course review</Heading>
          <Text muted size={1}>
            Courses teachers submitted from the Roam site. Approve to publish; request changes to send it back
            with a note. The site updates within seconds.
          </Text>
        </Stack>

        <TabList gap={2}>
          {TABS.map((t) => (
            <Tab
              key={t.key}
              id={`tab-${t.key}`}
              aria-controls="review-panel"
              label={`${t.label} (${counts[t.key] ?? 0})`}
              selected={tab === t.key}
              onClick={() => setTab(t.key)}
            />
          ))}
        </TabList>

        {error && (
          <Card tone="critical" padding={3} radius={2}>
            <Text size={1}>{error}</Text>
          </Card>
        )}

        <Stack id="review-panel" gap={3}>
          {reviews === null ? (
            <Flex justify="center" padding={5}>
              <Spinner muted />
            </Flex>
          ) : visible.length === 0 ? (
            <Card padding={5} radius={2} border tone="transparent">
              <Text align="center" muted>
                Nothing here.
              </Text>
            </Card>
          ) : (
            visible.map((review) => <ReviewCard key={review._id} review={review} onDecide={decide} />)
          )}
        </Stack>
      </Stack>
    </Container>
  )
}

function ReviewCard({
  review,
  onDecide,
}: {
  review: Review
  onDecide: (id: string, status: Review['status'], note?: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<null | 'changesRequested' | 'unpublished'>(null)
  const [note, setNote] = useState(review.note ?? '')
  const [busy, setBusy] = useState(false)
  const tabInfo = TABS.find((t) => t.key === review.status)

  const run = async (status: Review['status'], withNote?: string) => {
    setBusy(true)
    await onDecide(review._id, status, withNote)
    setBusy(false)
    setMode(null)
  }

  const facts = [
    review.teacherName && `by ${review.teacherName}`,
    review.categoryTitle,
    review.level && review.level.charAt(0).toUpperCase() + review.level.slice(1),
    review.price ? `$${review.price}` : 'Free',
    `${review.lessonCount ?? 0} lessons`,
    duration(review.durationSeconds),
    review.submittedAt && `submitted ${new Date(review.submittedAt).toLocaleDateString()}`,
  ].filter(Boolean)

  return (
    <Card padding={4} radius={3} border shadow={1}>
      <Stack gap={4}>
        <Flex align="flex-start" gap={3} wrap="wrap">
          <Box flex={1}>
            <Stack gap={3}>
              <Flex align="center" gap={2} wrap="wrap">
                <Heading size={1}>{review.title ?? 'Untitled course'}</Heading>
                <Badge tone={tabInfo?.tone} radius={2}>
                  {tabInfo?.label}
                </Badge>
              </Flex>
              <Text size={1} muted>
                {facts.join(' · ')}
              </Text>
              {review.summary && <Text size={1}>{review.summary}</Text>}
              {review.note && review.status !== 'approved' && (
                <Text size={1} muted>
                  Note to teacher: {review.note}
                </Text>
              )}
            </Stack>
          </Box>
        </Flex>

        <Box>
          <Button mode="bleed" text={open ? 'Hide course content' : 'Preview course content'} onClick={() => setOpen(!open)} />
        </Box>
        {open && (
          <Stack gap={4} paddingLeft={2}>
            {(review.outline ?? []).map((module, mi) => (
              <Stack key={module._key} gap={3}>
                <Text weight="semibold" size={1}>
                  Module {mi + 1} · {module.title || 'Untitled'}
                </Text>
                {(module.lessons ?? []).map((lesson, li) => {
                  const yt = youtubeId(lesson.videoUrl)
                  return (
                    <Flex key={lesson._key} gap={3} align="center">
                      {yt ? (
                        <img
                          src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`}
                          alt=""
                          width={96}
                          height={54}
                          style={{borderRadius: 4, objectFit: 'cover', flexShrink: 0}}
                        />
                      ) : (
                        <Box style={{width: 96, height: 54, flexShrink: 0}} />
                      )}
                      <Stack gap={2}>
                        <Text size={1}>
                          {mi + 1}.{li + 1} {lesson.title || 'Untitled'} · {duration(lesson.durationSeconds)}
                          {lesson.freePreview ? ' · Free preview' : ''}
                        </Text>
                        {lesson.videoUrl && (
                          <Text size={0} muted>
                            <a href={lesson.videoUrl} target="_blank" rel="noreferrer noopener">
                              {lesson.videoUrl}
                            </a>
                          </Text>
                        )}
                      </Stack>
                    </Flex>
                  )
                })}
              </Stack>
            ))}
          </Stack>
        )}

        {mode ? (
          <Stack gap={3}>
            <Text size={1} weight="medium">
              {mode === 'changesRequested' ? 'What should the teacher change?' : 'Why is it being unpublished?'}
            </Text>
            <TextArea rows={3} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
            <Flex gap={2}>
              <Button
                tone="critical"
                text={mode === 'changesRequested' ? 'Send back' : 'Unpublish'}
                disabled={busy || !note.trim()}
                loading={busy}
                onClick={() => run(mode, note.trim())}
              />
              <Button mode="ghost" text="Cancel" onClick={() => setMode(null)} />
            </Flex>
          </Stack>
        ) : (
          <Flex gap={2} wrap="wrap">
            {review.status !== 'approved' && (
              <Button tone="positive" text="Approve & publish" loading={busy} onClick={() => run('approved')} />
            )}
            {review.status === 'pending' && (
              <Button mode="ghost" tone="critical" text="Request changes" onClick={() => setMode('changesRequested')} />
            )}
            {review.status === 'approved' && (
              <Button mode="ghost" tone="critical" text="Unpublish" onClick={() => setMode('unpublished')} />
            )}
            {review.status === 'approved' && review.courseSlug && (
              <Button as="a" mode="bleed" text="View on site" href={`${SITE_URL}/courses/${review.courseSlug}`} target="_blank" />
            )}
          </Flex>
        )}
      </Stack>
    </Card>
  )
}

export const courseReviewTool: Tool = {
  name: 'course-review',
  title: 'Course Review',
  icon: ClipboardIcon,
  component: CourseReviewTool,
}
