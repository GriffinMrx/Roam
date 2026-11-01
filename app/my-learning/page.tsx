import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpotlightCard } from "@/components/spotlight-card";
import {
  AccessBadge,
  buttonStyles,
  CardCover,
  CourseCard,
  Icon,
  ProgressBar,
  raisedCardShadow,
  raisedPanel,
  type IconName,
} from "@/components/ui";
import { listBadges } from "@/lib/badges";
import type { BadgeView } from "@/lib/badges-shared";
import { cn } from "@/lib/cn";
import { imageSrc } from "@/lib/catalog";
import { formatDuration, formatLevel } from "@/lib/format";
import { teacherLearningDocs, teacherSaved } from "@/lib/teach/learner";
import { formatClock } from "@/lib/video";
import { getCourses } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";
import { readSaved } from "@/sanity/bookmarks";
import { getMyLearning, type ContinueLesson, type LearningCourse } from "@/sanity/my-learning";

export const metadata: Metadata = { title: "My Learning · Roam" };

/** Courses suggested in the empty state (popular first, COURSES_QUERY order). */
const SUGGESTED_COURSES = 3;

/**
 * The signed-in learner's dashboard, read-only (AGENTS §7). The proxy gates the route;
 * the learner's data reads the request, so it streams in behind Suspense.
 */
export default function MyLearningPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader active="my-learning" />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 pt-10 pb-16 sm:px-10">
        <h1 className="font-display text-display-1 text-foreground">My Learning</h1>
        <p className="mt-3 text-body-lg text-muted">Pick up where you left off and track your progress.</p>

        <Suspense fallback={<MyLearningSkeleton />}>
          <MyLearningContent />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

async function MyLearningContent() {
  // Per-request data from here on; without this, dev prerender validation flags the clock
  // reads inside the database and badge code (Date.now()) as a blocking route.
  await connection();
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/my-learning");

  // Editorial progress and bookmarks (Sanity) plus teacher courses (Neon, phase 2).
  const [teacherDocs, editorialSaved, teacherSavedItems, badges] = await Promise.all([
    teacherLearningDocs(userId),
    readSaved(userId),
    teacherSaved(userId),
    listBadges(userId),
  ]);
  const data = await getMyLearning(userId, teacherDocs);
  const saved: Saved = {
    courses: [...editorialSaved.courses, ...teacherSavedItems.courses],
    lessons: [...editorialSaved.lessons, ...teacherSavedItems.lessons],
  };
  const savedSection = <SavedSection saved={saved} />;
  const badgesSection = <BadgesSection badges={badges} />;
  if (data.inProgress.length === 0 && data.completed.length === 0) {
    return (
      <>
        <EmptyState />
        {badgesSection}
        {savedSection}
      </>
    );
  }

  return (
    <>
      {data.hero && <ContinueHero lesson={data.hero} />}

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon="check-circle" value={String(data.stats.lessonsCompleted)} label="Lessons completed" />
        <Stat icon="folder" value={String(data.stats.coursesFinished)} label="Courses finished" />
        <Stat icon="clock" value={data.stats.timeWatched} label="Time watched" />
      </ul>

      {badgesSection}

      {data.inProgress.length > 0 && (
        <section aria-labelledby="in-progress-title" className="mt-14">
          <h2 id="in-progress-title" className="text-heading-1 text-foreground">
            In Progress
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {data.inProgress.map((course) => (
              <InProgressCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {data.completed.length > 0 && (
        <section aria-labelledby="completed-title" className="mt-14">
          <h2 id="completed-title" className="text-heading-1 text-foreground">
            Completed
          </h2>
          <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
            {data.completed.map((course) => (
              <CompletedRow key={course.id} course={course} />
            ))}
          </ul>
        </section>
      )}

      {savedSection}
    </>
  );
}

function CoverTile({ url, title, className }: { url?: string; title: string; className: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-black font-semibold text-white ${className}`}
    >
      {url ? (
        <Image src={url} alt="" width={64} height={64} className="size-full object-cover" />
      ) : (
        title.charAt(0)
      )}
    </span>
  );
}

function ContinueHero({ lesson }: { lesson: ContinueLesson }) {
  const pct = lesson.duration > 0 ? (lesson.position / lesson.duration) * 100 : 0;

  return (
    <section
      aria-labelledby="continue-title"
      className="mt-10 flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-md md:flex-row"
    >
      {/* Poster in the lesson player's pre-play style */}
      <Link
        href={lesson.href}
        aria-label={`Continue ${lesson.label}: ${lesson.title}`}
        className="group relative aspect-video w-full shrink-0 bg-black md:w-[55%]"
      >
        {lesson.posterUrl && (
          <Image
            src={lesson.posterUrl}
            alt=""
            fill
            preload
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-black/85 via-black/40 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform duration-200 group-hover:scale-105 sm:size-20">
            <svg aria-hidden viewBox="0 0 24 24" className="ml-[6%] size-[38%]" fill="currentColor">
              <path d="M7 4.6c0-1.2 1.3-1.9 2.3-1.3l11 7.4c.9.6.9 2 0 2.6l-11 7.4c-1 .7-2.3-.1-2.3-1.3V4.6Z" />
            </svg>
          </span>
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-6 sm:p-8">
        <p className="text-small font-semibold tracking-widest text-subtle uppercase">Continue where you left off</p>
        <p className="mt-4 text-body text-muted">{lesson.courseTitle}</p>
        <h2 id="continue-title" className="mt-2 text-heading-1 text-foreground">
          {lesson.label} · {lesson.title}
        </h2>
        <ProgressBar value={pct} showLabel={false} label="Lesson progress" className="mt-6" />
        <p className="mt-2 text-small text-subtle tabular-nums">
          {formatClock(lesson.position)} of {formatClock(lesson.duration)}
        </p>
        <Link href={lesson.href} className={buttonStyles({ variant: "glossy", className: "mt-8 self-start" })}>
          Continue Learning
          <Icon name="arrow-right" size={20} />
        </Link>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <li className="flex items-center gap-4 rounded-lg border border-border bg-surface px-6 py-5 shadow-sm">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-neutral-50 text-primary-500">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="text-heading-1 text-foreground tabular-nums">{value}</p>
        <p className="text-body text-subtle">{label}</p>
      </div>
    </li>
  );
}

function InProgressCard({ course }: { course: LearningCourse }) {
  return (
    <SpotlightCard flush className="flex" style={raisedCardShadow}>
      <article className="flex flex-1 flex-col">
        <CardCover
          monogram={course.title.charAt(0)}
          cover={
            course.coverWideUrl ? (
              <Image
                src={course.coverWideUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            ) : undefined
          }
        />
        <div className={raisedPanel}>
          <h3 className="text-heading-3 text-foreground">
            <Link href={course.href} className="transition-colors hover:text-primary-400">
              {course.title}
            </Link>
          </h3>
          <p className="mt-1 inline-flex items-center gap-2 text-small text-muted">
            <Icon name="chart" size={16} />
            {course.level}
          </p>

          <div className="mt-5 mb-6">
            <div className="flex items-center justify-between text-small text-muted">
              <span className="inline-flex items-center gap-2">
                <Icon name="folder" size={16} />
                {course.moduleLabel}
              </span>
              <span className="tabular-nums">{course.percent}% complete</span>
            </div>
            <ProgressBar value={course.percent} showLabel={false} label={`${course.title} progress`} className="mt-3" />
          </div>

          <Link
            href={course.continueHref}
            className={buttonStyles({ variant: "glossy", className: "mt-auto w-full" })}
          >
            Continue
            <Icon name="arrow-right" size={20} />
          </Link>
        </div>
      </article>
    </SpotlightCard>
  );
}

function CompletedRow({ course }: { course: LearningCourse }) {
  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <CoverTile url={course.coverUrl} title={course.title} className="size-12 rounded-sm text-heading-2" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-lg text-foreground">{course.title}</p>
        <p className="mt-1 inline-flex items-center gap-2 text-small text-primary-500">
          <Icon name="check-circle" size={16} />
          Completed
        </p>
      </div>
      <Link
        href={course.href}
        className={buttonStyles({ variant: "text", size: "md" })}
      >
        Review
        <Icon name="arrow-right" size={18} />
      </Link>
    </li>
  );
}

type EditorialSaved = Awaited<ReturnType<typeof readSaved>>;
/** Saved items from both sources; teacher ones carry plain cover URLs. */
type Saved = {
  courses: ((NonNullable<EditorialSaved["courses"][number]> & { coverUrl?: string }) | null)[];
  lessons: ((Omit<NonNullable<EditorialSaved["lessons"][number]>, "course"> & {
    course: (NonNullable<NonNullable<EditorialSaved["lessons"][number]>["course"]> & { coverUrl?: string }) | null;
  }) | null)[];
};

/** Milestones (locked ones dimmed) and one badge per finished course. */
function BadgesSection({ badges }: { badges: { milestones: BadgeView[]; courses: BadgeView[] } }) {
  const all = [...badges.milestones, ...badges.courses];
  const earned = all.filter((b) => b.earnedAt).length;
  return (
    <section id="badges" aria-labelledby="badges-title" className="mt-14 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges-title" className="flex items-center gap-3 text-heading-1 text-foreground">
          <Icon name="star" size={28} className="text-primary-500" />
          Badges
        </h2>
        <p className="text-body text-muted">
          {earned} of {all.length} earned
        </p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {all.map((badge) => (
          <li
            key={badge.key}
            className={cn(
              "flex items-center gap-4 rounded-lg border border-ink/10 bg-linear-to-b from-ink/6 to-ink/2 p-4 shadow-(--shadow-panel-flat)",
              !badge.earnedAt && "opacity-50",
            )}
          >
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full",
                badge.earnedAt ? "bg-primary-100 text-primary-500 ring-1 ring-primary-200" : "bg-ink/6 text-subtle",
              )}
            >
              <Icon name={badge.earnedAt ? "star" : "lock"} size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-foreground">{badge.title}</p>
              <p className="text-small text-subtle">
                {badge.earnedAt
                  ? `Earned ${new Date(badge.earnedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                  : badge.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bookmarked courses (cover cards) and lessons (rows), newest first. Hidden when empty. */
function SavedSection({ saved }: { saved: Saved }) {
  const courses = saved.courses.filter((c): c is NonNullable<typeof c> => Boolean(c?.slug));
  const lessons = saved.lessons.filter((l): l is NonNullable<typeof l> => Boolean(l?.slug));
  if (courses.length === 0 && lessons.length === 0) return null;

  return (
    <section aria-labelledby="saved-title" className="mt-14">
      <h2 id="saved-title" className="flex items-center gap-3 text-heading-1 text-foreground">
        <Icon name="bookmark" size={28} className="text-primary-500" />
        Saved
      </h2>

      {courses.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {courses.map((course) => (
            <SpotlightCard key={course._id} flush className="flex" style={raisedCardShadow}>
              <CourseCard
                layout="cover"
                className="flex-1"
                href={`/courses/${course.slug}`}
                title={course.title ?? ""}
                description={course.summary ?? ""}
                level={formatLevel(course.level)}
                duration={formatDuration(course.durationSeconds)}
                modules={course.moduleCount ?? 0}
                cover={
                  imageSrc(course.coverImage, course.coverUrl, 800, 450) ? (
                    <Image
                      src={imageSrc(course.coverImage, course.coverUrl, 800, 450) ?? ""}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  ) : undefined
                }
              />
            </SpotlightCard>
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {lessons.map((lesson) => {
            const modules = lesson.course?.modules ?? [];
            const m = modules.findIndex((mod) => (mod.lessonIds ?? []).includes(lesson._id));
            const l = m >= 0 ? (modules[m].lessonIds ?? []).indexOf(lesson._id) : -1;
            const cover = imageSrc(lesson.course?.coverImage, lesson.course?.coverUrl, 96, 96);
            return (
              <li key={lesson._id} className="flex items-center gap-4 px-6 py-4">
                <CoverTile url={cover} title={lesson.title ?? ""} className="size-12 rounded-sm text-heading-2" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small text-subtle">
                    {lesson.course?.title}
                    {m >= 0 && l >= 0 && ` · Lesson ${m + 1}.${l + 1}`}
                  </p>
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="mt-0.5 block truncate text-body-lg text-foreground transition-colors hover:text-primary-400"
                  >
                    {lesson.title}
                  </Link>
                </div>
                <span className="hidden sm:inline">
                  <AccessBadge free={Boolean(lesson.freePreview)} />
                </span>
                <span className="hidden text-body text-subtle tabular-nums sm:inline">
                  {formatDuration(lesson.durationSeconds)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function EmptyState() {
  const courses = (await getCourses()).slice(0, SUGGESTED_COURSES);

  return (
    <>
      <section className="mt-10 flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-14 text-center shadow-md">
        <span className="flex size-14 items-center justify-center rounded-full bg-neutral-50 text-primary-500">
          <Icon name="play-circle" size={28} />
        </span>
        <h2 className="text-heading-1 text-foreground">You haven&rsquo;t started a course yet</h2>
        <p className="max-w-md text-body-lg text-muted">
          Start a lesson and it will show up here, so you can pick up right where you left off.
        </p>
        <Link href="/courses" className={buttonStyles({ variant: "glossy", className: "mt-4" })}>
          Browse all courses
          <Icon name="arrow-right" size={20} />
        </Link>
      </section>

      {courses.length > 0 && (
        <section aria-labelledby="popular-title" className="mt-14">
          <h2 id="popular-title" className="text-heading-1 text-foreground">
            Popular Courses
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {courses.map((course) => (
              <SpotlightCard key={course._id} flush className="flex" style={raisedCardShadow}>
                <CourseCard
                  layout="cover"
                  className="flex-1"
                  href={`/courses/${course.slug}`}
                  title={course.title ?? ""}
                  description={course.summary ?? ""}
                  level={formatLevel(course.level)}
                  duration={formatDuration(course.durationSeconds)}
                  modules={course.moduleCount ?? 0}
                  cover={
                    course.coverImage?.asset ? (
                      <Image
                        src={urlFor(course.coverImage).width(800).height(450).fit("crop").url()}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    ) : undefined
                  }
                />
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Same block structure as the loaded page, so nothing shifts. */
function MyLearningSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="mt-10 h-72 rounded-lg bg-neutral-50" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-22 rounded-lg bg-neutral-50" />
        ))}
      </div>
      <div className="mt-14 h-9 w-48 rounded-md bg-neutral-100" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 rounded-lg bg-neutral-50" />
        ))}
      </div>
    </div>
  );
}
