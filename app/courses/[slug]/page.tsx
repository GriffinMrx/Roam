import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { toPlainText } from "@portabletext/react";
import { BookmarkButton } from "@/components/bookmark-button";
import { CourseModules, type CourseModuleItem } from "@/components/course-modules";
import { CourseProgressProvider } from "@/components/course-progress";
import { LearnButton, ProgressStrip, type StripLesson } from "@/components/course-progress-ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpotlightCard } from "@/components/spotlight-card";
import {
  Badge,
  Breadcrumbs,
  buttonStyles,
  CardCover,
  CourseCard,
  Icon,
  MaybeIcon,
  raisedCardShadow,
  raisedPanel,
} from "@/components/ui";
import { formatCount, formatDuration, formatLevel, plural } from "@/lib/format";
import { getCourse, getCourseSlugs } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

export async function generateStaticParams() {
  return getCourseSlugs();
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  if (!course) return {};
  return { title: `${course.title} · Roam`, description: course.summary ?? undefined };
}

/**
 * The header, frame, and footer render immediately; the course itself reads `params`,
 * so it sits behind Suspense to keep navigation instant (docs: guides/instant-navigation).
 */
export default function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <main className="relative z-10 w-full flex-1 px-6 pt-8 pb-16 sm:px-10">
        <Suspense fallback={<CourseSkeleton />}>
          <CourseContent params={params} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Placeholder with the same block structure as the loaded page, so nothing shifts. */
function CourseSkeleton() {
  const block = "rounded-md bg-neutral-100";
  return (
    <div aria-hidden className="animate-pulse">
      <div className={`h-5 w-64 ${block}`} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-14">
        <div>
          <div className={`h-6 w-20 ${block}`} />
          <div className={`mt-6 h-14 w-3/4 ${block}`} />
          <div className={`mt-5 h-16 max-w-xl ${block}`} />
          <div className="mt-8 h-28 rounded-lg bg-neutral-50" />
          <div className="mt-14 h-80 rounded-lg bg-neutral-50" />
        </div>
        <div className="h-136 rounded-3xl bg-neutral-50" />
      </div>
    </div>
  );
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

/** A plain-text excerpt of the instructor bio, cut at a word boundary. */
function excerpt(text: string, max = 240) {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max))}…`;
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="inline-flex items-center gap-3 text-muted">
        <MaybeIcon name={icon} size={20} className="text-subtle" />
        {label}
      </span>
      <span className="text-foreground tabular-nums">{value}</span>
    </li>
  );
}

async function CourseContent({ params }: { params: PageProps<"/courses/[slug]">["params"] }) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();

  const modules = course.modules ?? [];
  const totalDuration = formatDuration(course.durationSeconds);
  const instructor = course.instructor;
  const related = course.related ?? [];

  // Course structure for the learner's progress, which loads client-side from /api/progress.
  const shape = {
    modules: modules.map((m) => ({ key: m._key, lessonIds: (m.lessons ?? []).map((l) => l._id) })),
  };
  const slugs: Record<string, string> = Object.fromEntries(
    modules.flatMap((m) => (m.lessons ?? []).map((l) => [l._id, l.slug ?? ""])),
  );
  // "Lesson 3.2 · Title" for the progress strip's next lesson.
  const stripLessons: Record<string, StripLesson> = Object.fromEntries(
    modules.flatMap((m, i) =>
      (m.lessons ?? []).map((l, j) => [
        l._id,
        { label: `Lesson ${i + 1}.${j + 1}`, title: l.title ?? "", slug: l.slug ?? "" },
      ]),
    ),
  );

  const moduleItems: CourseModuleItem[] = modules.map((module) => ({
    key: module._key,
    title: module.title ?? "",
    summary: module.summary ?? undefined,
    duration: formatDuration(module.durationSeconds),
    lessons: (module.lessons ?? []).map((lesson) => ({
      id: lesson._id,
      title: lesson.title ?? "",
      href: `/lessons/${lesson.slug}`,
      duration: formatDuration(lesson.durationSeconds),
      freePreview: Boolean(lesson.freePreview),
    })),
  }));

  return (
    <CourseProgressProvider courseId={course._id} course={shape}>
      <Breadcrumbs
        items={[{ label: "All Courses", href: "/courses" }, { label: course.title ?? "" }]}
      />

      {/*
       * Desktop: main column + a sticky side panel spanning both rows.
       * Mobile: hero, then the panel, then the rest, in source order.
       */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-14">
        {/* Hero */}
        <section className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-2">
            {course.popular && <Badge variant="popular">Popular</Badge>}
            {course.category?.title && <Badge variant="lesson">{course.category.title}</Badge>}
          </div>
          <h1 className="mt-6 font-display text-display-1 text-foreground sm:text-[3.5rem] sm:leading-16">
            {course.title}
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg leading-8 text-muted">{course.summary}</p>
          <ProgressStrip lessons={stripLessons} />
        </section>

        {/* Side panel */}
        <aside
          aria-label="Course details"
          className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
        >
          <div className="overflow-hidden rounded-3xl bg-card shadow-(--shadow-cover-ring)">
            <CardCover
              monogram={(course.title ?? "").charAt(0)}
              cover={
                course.coverImage?.asset ? (
                  <Image
                    src={urlFor(course.coverImage).width(800).height(450).fit("crop").url()}
                    alt={(course.coverImage as { alt?: string }).alt ?? ""}
                    fill
                    preload
                    sizes="(min-width: 1024px) 24rem, 100vw"
                    className="object-cover"
                  />
                ) : undefined
              }
            />
            <div className={raisedPanel}>
              {course.price != null && (
                <p className="flex items-center gap-3">
                  <MaybeIcon name="tag" size={24} className="text-subtle" />
                  <span className="text-heading-1 text-foreground">
                    {course.price > 0 ? usd.format(course.price) : "Free"}
                  </span>
                </p>
              )}
              <div className="mt-6 flex flex-col gap-3">
                <LearnButton slugs={slugs} className="w-full" />
                <BookmarkButton id={course._id} className="w-full" />
              </div>
              <ul className="mt-6 divide-y divide-ink/6 border-t border-ink/6 text-body">
                <Detail icon="chart" label="Level" value={formatLevel(course.level)} />
                <Detail icon="clock" label="Duration" value={totalDuration} />
                <Detail icon="folder" label="Modules" value={String(modules.length)} />
                <Detail icon="book-open" label="Lessons" value={String(course.lessonCount ?? 0)} />
                <Detail icon="user" label="Students" value={formatCount(course.studentCount)} />
              </ul>
            </div>
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {/* Course content */}
          <section id="course-content" aria-labelledby="content-title" className="scroll-mt-28">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="content-title" className="text-heading-2 text-foreground">
                Course Content
              </h2>
              <p className="text-body text-muted">
                {plural(modules.length, "module")}
                <span aria-hidden className="mx-2">
                  •
                </span>
                {totalDuration}
              </p>
            </div>
            <div className="mt-6">
              <CourseModules modules={moduleItems} />
            </div>
          </section>

          {/* Instructor */}
          {instructor?.slug && (
            <section aria-labelledby="instructor-title" className="mt-12">
              <h2 id="instructor-title" className="flex items-center gap-3 text-heading-2 text-foreground">
                <MaybeIcon name="graduation-cap" size={24} className="text-primary-500" />
                Your Instructor
              </h2>
              <div className="mt-6 flex flex-col gap-6 rounded-lg border border-ink/10 bg-linear-to-b from-ink/6 to-ink/2 p-6 shadow-(--shadow-panel) sm:flex-row sm:p-8">
                <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-heading-1 text-foreground ring-2 ring-ink/10">
                  {instructor.photo?.asset ? (
                    <Image
                      src={urlFor(instructor.photo).width(160).height(160).fit("crop").url()}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    instructor.name?.charAt(0)
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="text-heading-2 text-foreground">
                    <Link
                      href={`/instructors/${instructor.slug}`}
                      className="transition-colors hover:text-primary-400"
                    >
                      {instructor.name}
                    </Link>
                  </h3>
                  {instructor.expertise && instructor.expertise.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {instructor.expertise.map((topic) => (
                        <li
                          key={topic}
                          className="rounded-full bg-ink/6 px-3 py-1 text-small text-soft ring-1 ring-ink/10 ring-inset"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}
                  {instructor.bio && (
                    <p className="mt-4 text-body leading-6 text-muted">{excerpt(toPlainText(instructor.bio))}</p>
                  )}
                  <Link
                    href={`/instructors/${instructor.slug}`}
                    className={buttonStyles({ variant: "text", size: "md", className: "mt-4" })}
                  >
                    View profile
                    <Icon name="arrow-right" size={18} />
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* More in this category */}
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-16">
          <h2 id="related-title" className="text-heading-2 text-foreground">
            More in {course.category?.title ?? "this category"}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <SpotlightCard key={item._id} flush className="flex" style={raisedCardShadow}>
                <CourseCard
                  layout="cover"
                  className="flex-1"
                  href={`/courses/${item.slug}`}
                  title={item.title ?? ""}
                  description={item.summary ?? ""}
                  level={formatLevel(item.level)}
                  duration={formatDuration(item.durationSeconds)}
                  modules={item.moduleCount ?? 0}
                  cover={
                    item.coverImage?.asset ? (
                      <Image
                        src={urlFor(item.coverImage).width(800).height(450).fit("crop").url()}
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
    </CourseProgressProvider>
  );
}
