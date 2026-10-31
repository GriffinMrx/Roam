import Link from "next/link";
import { DotGrid } from "@/components/dot-grid";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SpotlightCard } from "@/components/spotlight-card";
import { buttonStyles, CourseCard, Icon, SearchInput } from "@/components/ui";

const courses = [
  {
    title: "Next.js for Production",
    description: "Build scalable, high-performance web applications with Next.js.",
    level: "Intermediate",
    duration: "18h 24m",
    modules: 12,
    monogram: "N",
    monogramClassName: "bg-neutral-900",
  },
  {
    title: "Docker Essentials",
    description: "Containerize applications and streamline your development workflow.",
    level: "Beginner",
    duration: "10h 12m",
    modules: 8,
    monogram: "D",
    monogramClassName: "bg-[#2496ed]",
  },
  {
    title: "TypeScript Deep Dive",
    description: "Go beyond the basics and write safer, more expressive code.",
    level: "Intermediate",
    duration: "14h 36m",
    modules: 10,
    monogram: "TS",
    monogramClassName: "bg-[#3178c6]",
  },
];

/* Decorative bars along the bottom edge: [left %, width %, height px] */
const bars: [number, number, number][] = [
  [0, 7, 90], [7, 6, 120], [13, 6, 150], [19, 6, 190], [25, 9, 130], [34, 5, 95],
  [49, 3, 70], [52, 8, 110], [60, 8, 140], [68, 5, 150], [73, 6, 190],
  [79, 5, 110], [84, 4, 130], [88, 12, 170],
];

export default function Home() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-background">
      <SiteHeader />

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <DotGrid />
          <div className="relative flex flex-col items-center px-6 pt-16 pb-14 text-center">
            <p className="rounded-sm border border-primary-200 bg-primary-100 px-4 py-2 text-small font-semibold tracking-widest text-primary-500 uppercase">
              Intelligent Learning
            </p>
            <h1 className="mt-8 max-w-3xl font-display text-display-1 text-balance sm:text-[4rem] sm:leading-[4.5rem]">
              Search your learning in plain English.
            </h1>
            <p className="mt-6 max-w-md text-body-lg text-muted">
              Roam understands what you want to learn and finds the exact lessons across all your
              courses.
            </p>
            <Link href="#courses" className={buttonStyles({ className: "mt-10 px-6 shadow-md" })}>
              Explore Courses
              <Icon name="arrow-right" size={20} />
            </Link>
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
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {courses.map((course) => (
              <SpotlightCard key={course.title}>
                <CourseCard layout="stacked" {...course} />
              </SpotlightCard>
            ))}
          </div>

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

      {/* Decorative footer bars */}
      <div aria-hidden className="relative h-48">
        {bars.map(([left, width, height]) => (
          <span
            key={left}
            className="absolute bottom-0 bg-linear-to-t from-primary-300 to-primary-100/0"
            style={{ left: `${left}%`, width: `${width}%`, height }}
          />
        ))}
      </div>
    </div>
  );
}
