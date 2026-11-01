import Link from "next/link";
import {
  CourseResults,
  CourseSearchProvider,
  HomeCategoryChips,
  HomeSearchInput,
  type CourseSearchItem,
} from "@/components/course-search";
import { HeroHeadingLine, HeroSwarm } from "@/components/hero-art";
import { HoverBorderGradient } from "@/components/hover-border-gradient";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Icon } from "@/components/ui";
import { formatDuration, formatLevel } from "@/lib/format";
import { getCategories, getCourses } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

/** Cards shown on the home page; popular courses come first (COURSES_QUERY order). */
const HOME_COURSE_LIMIT = 6;

/**
 * Seeded courses from Sanity; the read is cached server-side (sanity/lib/fetch).
 * All courses go to the client as public card fields so the hero search can filter them in place.
 */
async function CourseGrid() {
  const courses: CourseSearchItem[] = (await getCourses()).map((course) => ({
    id: course._id,
    slug: course.slug,
    title: course.title ?? "",
    summary: course.summary ?? "",
    level: formatLevel(course.level),
    duration: formatDuration(course.durationSeconds),
    modules: course.moduleCount ?? 0,
    imageUrl: course.coverImage?.asset
      ? urlFor(course.coverImage).width(800).height(450).fit("crop").url()
      : undefined,
    category: course.category?.title ?? "",
    categorySlug: course.category?.slug ?? "",
    lessonTitles: (course.lessonTitles ?? []).filter(Boolean),
  }));

  return <CourseResults courses={courses} defaultLimit={HOME_COURSE_LIMIT} />;
}

/** Category chips under the hero search: the Sanity categories (cached read), "All" first. */
async function HeroCategories() {
  const categories = (await getCategories())
    .filter((c) => c.slug && c.title)
    .map((c) => ({ slug: c.slug as string, title: c.title as string }));
  return <HomeCategoryChips categories={categories} />;
}

export default function Home() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <CourseSearchProvider>
      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Hero content is passed as children so the swarm can flow around hovered buttons */}
          <HeroSwarm>
          <div className="relative flex flex-col items-center px-6 pt-16 pb-14 text-center">
            {/* Tech Text draws a single line, so each line of the heading is its own canvas (colors per theme: hero-art) */}
            <h1 className="w-full max-w-3xl font-display text-foreground">
              <span className="block h-16 sm:h-24">
                <HeroHeadingLine text="Search your learning" line="top" />
              </span>
              <span className="block h-16 sm:h-24">
                <HeroHeadingLine text="in plain English." line="bottom" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-body-lg text-muted">
              Roam understands what you want to learn and finds the exact lessons across all your
              courses.
            </p>
            <HoverBorderGradient
              as="a"
              href="/courses"
              containerClassName="mt-10"
              className="flex items-center gap-2 px-6 py-2.5 text-body-lg font-medium"
            >
              Explore Courses
              <Icon name="arrow-right" size={20} />
            </HoverBorderGradient>
            <div className="mt-12 w-full max-w-3xl">
              <HomeSearchInput id="home-search" />
              <SearchShortcut targetId="home-search" />
            </div>
            <div className="w-full max-w-4xl">
              <HeroCategories />
            </div>
          </div>
          </HeroSwarm>
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
              href="/courses"
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
      </CourseSearchProvider>

      <SiteFooter />
    </div>
  );
}
