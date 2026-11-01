import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { toPlainText } from "@portabletext/react";
import { BookmarkButton } from "@/components/bookmark-button";
import { CourseProgressProvider } from "@/components/course-progress";
import { LessonSidebar, type SidebarModule } from "@/components/lesson-sidebar";
import { LessonTabs } from "@/components/lesson-tabs";
import { PortableText } from "@/components/portable-text";
import { SiteHeader } from "@/components/site-header";
import { AccessBadge, Badge, Breadcrumbs, buttonStyles, Icon, MaybeIcon } from "@/components/ui";
import { VideoPlayer, VideoPoster } from "@/components/video-player";
import { formatDuration, formatLevel } from "@/lib/format";
import { readPreferences } from "@/lib/preferences";
import { DEFAULT_PREFERENCES } from "@/lib/preferences-shared";
import { parseStartSeconds, parseVideoUrl, youtubeThumbnail } from "@/lib/video";
import { getLesson, getLessonSlugs } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

type Params = PageProps<"/lessons/[slug]">["params"];
type SearchParams = PageProps<"/lessons/[slug]">["searchParams"];
type Lesson = NonNullable<Awaited<ReturnType<typeof getLesson>>>;

export async function generateStaticParams() {
  return getLessonSlugs();
}

export async function generateMetadata({ params }: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const lesson = await getLesson((await params).slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} · ${lesson.course?.title ?? "Roam"}`,
    description: lesson.summary ?? lesson.keyPoints?.[0] ?? undefined,
  };
}

/** Resource type → icon; every type the schema allows has one. */
const RESOURCE_ICON: Record<string, string> = {
  documentation: "file",
  guide: "file",
  article: "file",
  link: "file",
  repository: "code",
  download: "folder",
};

/**
 * Header renders immediately; the lesson reads `params` (and the video reads
 * `searchParams` for ?t=), so both sit behind Suspense to keep navigation instant.
 */
export default function LessonPage({ params, searchParams }: PageProps<"/lessons/[slug]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <Suspense fallback={<LessonSkeleton />}>
        <LessonContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function LessonSkeleton() {
  const block = "rounded-md bg-neutral-100";
  return (
    <div aria-hidden className="flex flex-1 animate-pulse">
      <div className="hidden w-75 shrink-0 border-r border-border lg:block" />
      <div className="flex-1 px-6 pt-8 sm:px-10">
        <div className="max-w-4xl">
          <div className={`h-5 w-80 ${block}`} />
          <div className={`mt-10 h-6 w-24 ${block}`} />
          <div className={`mt-5 h-14 w-2/3 ${block}`} />
          <div className={`mt-5 h-12 max-w-xl ${block}`} />
          <div className="mt-8 aspect-video w-full rounded-lg bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

async function LessonContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const lesson = await getLesson((await params).slug);
  if (!lesson) notFound();

  const course = lesson.course;
  const modules = course?.modules ?? [];
  // Course structure for the learner's progress, which loads client-side from /api/progress.
  const courseShape = {
    modules: modules.map((m) => ({ key: m._key, lessonIds: (m.lessons ?? []).map((l) => l._id) })),
  };

  // Position in the course, derived from order (never stored).
  const flat = modules.flatMap((module, mi) =>
    (module.lessons ?? []).map((l, li) => ({ ...l, moduleIndex: mi, label: `${mi + 1}.${li + 1}` })),
  );
  const index = flat.findIndex((l) => l._id === lesson._id);
  const here = flat[index];
  const prev = index > 0 ? flat[index - 1] : undefined;
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : undefined;
  const currentModule = here?.moduleIndex ?? 0;
  const currentModuleData = modules[currentModule];

  // Subtitle: the summary, or the notes' opening paragraph (then not repeated below).
  const notes = lesson.notes ?? [];
  const firstBlock = notes[0];
  const leadFromNotes =
    !lesson.summary && firstBlock?._type === "block" && firstBlock.style === "normal" && !firstBlock.listItem
      ? toPlainText([firstBlock])
      : null;
  const subtitle = lesson.summary ?? leadFromNotes;

  const sidebarModules: SidebarModule[] = modules.map((m) => ({
    key: m._key,
    title: m.title ?? "",
    duration: formatDuration(m.durationSeconds),
    lessons: (m.lessons ?? []).map((l) => ({
      id: l._id,
      title: l.title ?? "",
      href: `/lessons/${l.slug}`,
      duration: formatDuration(l.durationSeconds),
      current: l._id === lesson._id,
    })),
  }));

  const video = parseVideoUrl(lesson.videoUrl);
  const poster = lesson.thumbnail?.asset
    ? urlFor(lesson.thumbnail).width(1280).height(720).fit("crop").url()
    : video?.provider === "youtube"
      ? youtubeThumbnail(video.id)
      : undefined;
  const lessonTitle = lesson.title ?? "Lesson video";
  const instructor = course?.instructor?.name ?? undefined;

  return (
    <CourseProgressProvider courseId={course?._id ?? ""} course={courseShape}>
      <div className="flex flex-1 flex-col lg:flex-row">
        {course && (
          <LessonSidebar
            courseTitle={course.title ?? ""}
            courseHref={`/courses/${course.slug}`}
            coverUrl={course.coverImage?.asset ? urlFor(course.coverImage).width(112).height(112).fit("crop").url() : undefined}
            modules={sidebarModules}
            currentModule={currentModule}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-6 pt-8 pb-12 sm:px-10">
            <div className="max-w-4xl">
              <Breadcrumbs
                items={[
                  { label: "All Courses", href: "/courses" },
                  ...(course ? [{ label: course.title ?? "", href: `/courses/${course.slug}` }] : []),
                  ...(course && currentModuleData ? [{ label: currentModuleData.title ?? "", href: `/courses/${course.slug}#course-content` }] : []),
                  { label: lesson.title ?? "" },
                ]}
              />

              <div className="mt-10 flex flex-wrap items-center gap-2">
                {here && <Badge variant="popular">Lesson {here.label}</Badge>}
                <AccessBadge free={Boolean(lesson.freePreview)} />
              </div>
              <div className="mt-5 flex items-start justify-between gap-6">
                <h1 className="font-display text-display-1 text-foreground">{lesson.title}</h1>
                <BookmarkButton id={lesson._id} />
              </div>
              {subtitle && <p className="mt-4 max-w-2xl text-body-lg leading-8 text-muted">{subtitle}</p>}

              <ul className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-body text-muted">
                {course?.instructor?.slug && (
                  <li>
                    <Link
                      href={`/instructors/${course.instructor.slug}`}
                      className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                    >
                      <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-small text-foreground">
                        {course.instructor.photo?.asset ? (
                          <Image
                            src={urlFor(course.instructor.photo).width(48).height(48).fit("crop").url()}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        ) : (
                          course.instructor.name?.charAt(0)
                        )}
                      </span>
                      {course.instructor.name}
                    </Link>
                  </li>
                )}
                <li className="inline-flex items-center gap-2">
                  <Icon name="clock" size={20} className="text-subtle" />
                  {formatDuration(lesson.durationSeconds)}
                </li>
                {course?.level && (
                  <li className="inline-flex items-center gap-2">
                    <Icon name="chart" size={20} className="text-subtle" />
                    {formatLevel(course.level)}
                  </li>
                )}
                <li className="inline-flex items-center gap-2">
                  <Icon name="user" size={20} className="text-subtle" />
                  {(lesson.studentCount ?? 0).toLocaleString("en-US")} students
                </li>
              </ul>

              <div className="mt-8">
                {video ? (
                  <Suspense
                    fallback={<VideoFallback poster={poster} title={lessonTitle} instructor={instructor} />}
                  >
                    <LessonVideo
                      searchParams={searchParams}
                      source={video}
                      title={lessonTitle}
                      poster={poster}
                      instructor={instructor}
                      durationHint={lesson.durationSeconds ?? 0}
                      lessonId={lesson._id}
                    />
                  </Suspense>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-black p-6 text-center text-body text-muted">
                    This video can&rsquo;t be played here.
                  </div>
                )}
              </div>

              <div className="mt-10">
                <LessonTabs notes={<LessonNotes notes={notes} />} lessonId={lesson._id} durationSeconds={lesson.durationSeconds ?? undefined}>
                  <LessonBody lesson={lesson} />
                </LessonTabs>
              </div>
            </div>
          </main>

          {(prev || next) && (
            <nav
              aria-label="Lesson navigation"
              className="flex flex-col gap-4 border-t border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10"
            >
              {prev ? (
                <div className="flex items-center gap-6">
                  <Link href={`/lessons/${prev.slug}`} className={buttonStyles({ variant: "tertiary", className: "px-5" })}>
                    <Icon name="arrow-right" size={20} className="rotate-180" />
                    Previous Lesson
                  </Link>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-small text-muted">{prev.title}</p>
                    <p className="mt-1 text-small text-subtle">{formatDuration(prev.durationSeconds)}</p>
                  </div>
                </div>
              ) : (
                <span />
              )}
              {next && (
                <div className="flex items-center gap-6 sm:ml-auto">
                  <div className="hidden min-w-0 text-right sm:block">
                    <p className="truncate text-small text-muted">{next.title}</p>
                    <p className="mt-1 text-small text-subtle">{formatDuration(next.durationSeconds)}</p>
                  </div>
                  <Link href={`/lessons/${next.slug}`} className={buttonStyles({ className: "px-5 shadow-md" })}>
                    Next Lesson
                    <Icon name="arrow-right" size={20} />
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </CourseProgressProvider>
  );
}

/**
 * Starts the player at ?t=<seconds> when given (search results and Continue Learning
 * link there); otherwise the player resumes the learner's saved position on first play.
 * Reads searchParams (runtime data).
 */
async function LessonVideo({
  searchParams,
  ...props
}: { searchParams: SearchParams } & Omit<React.ComponentProps<typeof VideoPlayer>, "start" | "resume" | "preferences">) {
  const t = (await searchParams).t;
  // The learner's settings (speed, captions, resume); defaults when signed out or unavailable.
  const { userId } = await auth();
  const preferences = userId ? await readPreferences(userId).catch(() => DEFAULT_PREFERENCES) : DEFAULT_PREFERENCES;
  return (
    <VideoPlayer
      {...props}
      start={t !== undefined ? parseStartSeconds(t) : 0}
      resume={t === undefined && preferences.resume}
      preferences={preferences}
    />
  );
}

/** Same look as the player's pre-play state, so nothing shifts when it streams in. */
function VideoFallback(props: { poster?: string; title: string; instructor?: string }) {
  return (
    <div className="relative isolate aspect-video w-full overflow-hidden rounded-lg bg-black [clip-path:inset(0_round_var(--radius-lg))]">
      <VideoPoster {...props} />
    </div>
  );
}

/** The Notes tab: the lesson's notes from Sanity (Portable Text). */
function LessonNotes({ notes }: { notes: NonNullable<Lesson["notes"]> }) {
  if (notes.length === 0) {
    return (
      <div className="px-1 py-10 sm:px-4">
        <p className="text-body-lg text-foreground">No notes for this lesson yet</p>
        <p className="mt-1 text-body text-muted">The instructor hasn&rsquo;t added notes to this lesson.</p>
      </div>
    );
  }
  return (
    <div className="max-w-3xl px-1 py-8 sm:px-4">
      <PortableText value={notes} />
    </div>
  );
}

/** The Lesson Content tab: key points, pro tip, and resources. */
function LessonBody({ lesson }: { lesson: Lesson }) {
  const keyPoints = lesson.keyPoints ?? [];
  const resources = lesson.resources ?? [];

  return (
    <div className="px-1 py-8 sm:px-4">
      {keyPoints.length > 0 && (
        <section aria-labelledby="key-points-title" className="mt-8 border-t border-border pt-8 first:mt-0 first:border-t-0 first:pt-0">
          <h2 id="key-points-title" className="text-body-lg font-medium text-foreground">
            In this lesson you will:
          </h2>
          <ul className="mt-5 space-y-4">
            {keyPoints.map((point) => (
              <li key={point} className="flex items-start gap-4 text-body-lg text-muted">
                <Icon name="check-circle" size={22} className="mt-0.5 shrink-0 text-primary-500" />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.proTip && (
        <aside className="mt-8 flex gap-4 rounded-md border border-primary-200 bg-primary-100/40 p-5 first:mt-0">
          <MaybeIcon name="bulb" size={24} className="shrink-0 text-primary-500" />
          <div>
            <p className="text-body-lg font-medium text-foreground">Pro Tip</p>
            <p className="mt-2 text-body leading-6 text-muted">{lesson.proTip}</p>
          </div>
        </aside>
      )}

      {resources.length > 0 && (
        <section aria-labelledby="resources-title" className="mt-8 border-t border-border pt-8 first:mt-0 first:border-t-0 first:pt-0">
          <h2 id="resources-title" className="text-heading-3 text-foreground">
            Resources
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <li key={resource._key}>
                <a
                  href={resource.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border text-muted">
                    <MaybeIcon name={RESOURCE_ICON[resource.type ?? ""] ?? "file"} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-foreground">{resource.title}</span>
                    {resource.description && (
                      <span className="mt-1.5 block text-small leading-5 text-subtle">{resource.description}</span>
                    )}
                  </span>
                  <Icon name="link-external" size={18} className="mt-0.5 shrink-0 self-end text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
