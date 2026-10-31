import Image from "next/image";
import Link from "next/link";
import { DotGrid } from "@/components/dot-grid";
import { FooterBars } from "@/components/footer-bars";
import { HoverBorderGradient } from "@/components/hover-border-gradient";
import { MovingBorderBadge } from "@/components/moving-border";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SpotlightCard } from "@/components/spotlight-card";
import { TechText } from "@/components/tech-text";
import { CourseCard, Icon, SearchInput } from "@/components/ui";
import { formatDuration, formatLevel } from "@/lib/format";
import { getCourses } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

/** Cards shown on the home page; popular courses come first (COURSES_QUERY order). */
const HOME_COURSE_LIMIT = 6;

/** Seeded courses from Sanity; the read is cached server-side (sanity/lib/fetch). */
async function CourseGrid() {
  const courses = (await getCourses()).slice(0, HOME_COURSE_LIMIT);

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {courses.map((course) => (
        <SpotlightCard key={course._id} className="flex">
          <CourseCard
            layout="stacked"
            framed={false}
            className="flex-1"
            href={`/courses/${course.slug}`}
            title={course.title ?? ""}
            description={course.summary ?? ""}
            level={formatLevel(course.level)}
            duration={formatDuration(course.durationSeconds)}
            modules={course.moduleCount ?? 0}
            media={
              course.coverImage?.asset ? (
                <Image
                  src={urlFor(course.coverImage).width(128).height(128).fit("crop").url()}
                  alt=""
                  width={64}
                  height={64}
                  className="size-full object-cover"
                />
              ) : undefined
            }
          />
        </SpotlightCard>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <DotGrid activeColorVar="--color-white" />
          <div className="relative flex flex-col items-center px-6 pt-16 pb-14 text-center">
            <MovingBorderBadge
              className="px-4 py-2 text-small font-semibold tracking-widest uppercase"
            >
              <span className="bg-linear-to-r from-white to-neutral-700 bg-clip-text text-transparent">
                Intelligent Learning
              </span>
            </MovingBorderBadge>
            {/* Tech Text draws a single line, so each line of the heading is its own canvas */}
            <h1 className="mt-8 w-full max-w-3xl font-display text-foreground">
              <span className="block h-16 sm:h-24">
                <TechText text="Search your learning" fontWeight={700} fontSize={64} />
              </span>
              <span className="block h-16 sm:h-24">
                <TechText text="in plain English." fontWeight={700} fontSize={64} />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-body-lg text-muted">
              Roam understands what you want to learn and finds the exact lessons across all your
              courses.
            </p>
            <HoverBorderGradient
              as="a"
              href="#courses"
              containerClassName="mt-10"
              className="flex items-center gap-2 px-6 py-2.5 text-body-lg font-medium"
            >
              Explore Courses
              <Icon name="arrow-right" size={20} />
            </HoverBorderGradient>
            <div className="mt-12 w-full max-w-3xl">
              <SearchInput
                id="home-search"
                fieldSize="lg"
                aria-label="Ask anything about your learning"
                placeholder="Ask anything about your learning..."
              />
              <SearchShortcut targetId="home-search" />
            </div>
          </div>
        </section>

        {/* All courses */}
        <section
          id="courses"
          aria-labelledby="courses-title"
          className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 py-14 sm:px-10"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="courses-title" className="text-heading-1">
              All Courses
            </h2>
            <Link
              href="#courses"
              className="inline-flex items-center gap-2 text-body font-medium text-primary-500 transition-colors hover:text-primary-600"
            >
              View all courses
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
          <CourseGrid />

          <div className="mt-16 flex items-center gap-6">
            <span className="h-px flex-1 bg-border" />
            <p className="flex items-center gap-4 text-body-lg text-muted">
              <Icon name="star" size={24} className="text-primary-500" />
              New courses and lessons added every week.
            </p>
            <span className="h-px flex-1 bg-border" />
          </div>
        </section>
      </main>

      <FooterBars />
    </div>
  );
}
