import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PortableText } from "@/components/portable-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpotlightCard } from "@/components/spotlight-card";
import { Breadcrumbs, CourseCard, MaybeIcon, raisedCardShadow } from "@/components/ui";
import { formatCount, formatDuration, formatLevel } from "@/lib/format";
import { getInstructor, getInstructorSlugs } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

export async function generateStaticParams() {
  return getInstructorSlugs();
}

export async function generateMetadata({ params }: PageProps<"/instructors/[slug]">): Promise<Metadata> {
  const instructor = await getInstructor((await params).slug);
  if (!instructor) return {};
  return { title: `${instructor.name} · Roam` };
}

/** Instructor profile: public, read-only (AGENTS §8). Lessons stay behind sign-in. */
export default function InstructorPage({ params }: PageProps<"/instructors/[slug]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 pt-8 pb-16 sm:px-10">
        <Suspense fallback={<InstructorSkeleton />}>
          <InstructorContent params={params} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

function InstructorSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-5 w-64 rounded-md bg-neutral-100" />
      <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-center">
        <div className="size-40 shrink-0 rounded-full bg-neutral-100" />
        <div className="flex-1">
          <div className="h-14 w-2/3 rounded-md bg-neutral-100" />
          <div className="mt-4 h-7 w-1/2 rounded-md bg-neutral-100" />
          <div className="mt-6 h-20 max-w-xl rounded-lg bg-neutral-50" />
        </div>
      </div>
      <div className="mt-14 h-48 rounded-lg bg-neutral-50" />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/10 bg-linear-to-b from-white/6 to-white/2 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <MaybeIcon name={icon} size={24} className="text-primary-500" />
      <div>
        <p className="text-heading-2 text-foreground tabular-nums">{value}</p>
        <p className="text-small text-subtle">{label}</p>
      </div>
    </li>
  );
}

async function InstructorContent({ params }: { params: PageProps<"/instructors/[slug]">["params"] }) {
  const instructor = await getInstructor((await params).slug);
  if (!instructor) notFound();

  const courses = instructor.courses ?? [];
  const lessons = courses.reduce((sum, c) => sum + (c.lessonCount ?? 0), 0);
  const students = courses.reduce((sum, c) => sum + (c.studentCount ?? 0), 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "All Courses", href: "/courses" }, { label: "Instructors" }, { label: instructor.name ?? "" }]} />

      {/* Hero */}
      <section className="mt-10 flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
        <span className="relative flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 font-display text-display-1 text-foreground shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ring-4 ring-white/10 sm:size-40">
          {instructor.photo?.asset ? (
            <Image
              src={urlFor(instructor.photo).width(320).height(320).fit("crop").url()}
              alt={(instructor.photo as { alt?: string }).alt ?? ""}
              fill
              preload
              sizes="160px"
              className="object-cover"
            />
          ) : (
            instructor.name?.charAt(0)
          )}
        </span>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-small font-semibold tracking-widest text-subtle uppercase">
            <MaybeIcon name="graduation-cap" size={18} className="text-primary-500" />
            Instructor
          </p>
          <h1 className="mt-3 font-display text-display-1 text-foreground sm:text-[3.5rem] sm:leading-16">
            {instructor.name}
          </h1>
          {instructor.expertise && instructor.expertise.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {instructor.expertise.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full bg-white/6 px-3 py-1 text-small text-[#d4d4d8] ring-1 ring-white/10 ring-inset"
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat icon="book-open" value={String(courses.length)} label={courses.length === 1 ? "Course" : "Courses"} />
        <Stat icon="folder" value={String(lessons)} label="Lessons" />
        <Stat icon="user" value={formatCount(students)} label="Students" />
      </ul>

      {instructor.bio && instructor.bio.length > 0 && (
        <section aria-labelledby="about-title" className="mt-14 max-w-3xl">
          <h2 id="about-title" className="text-heading-2 text-foreground">
            About
          </h2>
          <div className="mt-4 text-body-lg leading-8 text-muted">
            <PortableText value={instructor.bio} />
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section aria-labelledby="courses-title" className="mt-14">
          <h2 id="courses-title" className="text-heading-2 text-foreground">
            Courses by {instructor.name}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
