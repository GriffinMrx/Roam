import type { Metadata } from "next";
import { Suspense } from "react";
import { CourseCatalog, type CatalogCategory, type CatalogCourse } from "@/components/course-catalog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllCourses, imageSrc } from "@/lib/catalog";
import { formatDuration, formatLevel } from "@/lib/format";
import { getCategories } from "@/sanity/data";

export const metadata: Metadata = {
  title: "All Courses · Roam",
  description: "Browse every Roam course by topic, level, and length.",
};

/**
 * Public course catalog (AGENTS §7: browsing stays public; course pages are gated).
 * Content is read and cached server-side; filters and sort live in the URL, read by
 * the client catalog, so it renders behind Suspense.
 */
export default function CoursesPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader active="courses" />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 pt-10 pb-16 sm:px-10">
        <h1 className="font-display text-display-1 text-foreground">All Courses</h1>
        <p className="mt-3 text-body-lg text-muted">
          Find your next course by topic, level, or length.
        </p>

        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

async function Catalog() {
  const [rawCourses, rawCategories] = await Promise.all([getAllCourses(), getCategories()]);

  const courses: CatalogCourse[] = rawCourses.map((course) => ({
    id: course._id,
    slug: course.slug,
    title: course.title ?? "",
    summary: course.summary ?? "",
    level: formatLevel(course.level),
    levelKey: course.level ?? "",
    duration: formatDuration(course.durationSeconds),
    durationSeconds: course.durationSeconds ?? 0,
    modules: course.moduleCount ?? 0,
    coverUrl: imageSrc(course.coverImage, course.coverUrl, 800, 450),
    category: course.category?.title ?? "",
    categorySlug: course.category?.slug ?? "",
    lessonTitles: (course.lessonTitles ?? []).filter(Boolean),
    price: course.price ?? null,
    popular: Boolean(course.popular),
    students: course.studentCount ?? 0,
    createdAt: course._createdAt,
  }));

  // Only categories that have courses get a chip.
  const used = new Set(courses.map((c) => c.categorySlug));
  const categories: CatalogCategory[] = rawCategories
    .filter((c) => c.slug && used.has(c.slug))
    .map((c) => ({ slug: c.slug ?? "", title: c.title ?? "", description: c.description ?? "" }));

  return <CourseCatalog courses={courses} categories={categories} />;
}

/** Same block structure as the loaded catalog, so nothing shifts. */
function CatalogSkeleton() {
  return (
    <div aria-hidden className="mt-10 animate-pulse">
      <div className="h-16 rounded-lg bg-neutral-50" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-neutral-100" />
        ))}
      </div>
      <div className="mt-8 flex gap-10">
        <div className="hidden h-72 w-60 shrink-0 rounded-lg bg-neutral-50 lg:block" />
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-neutral-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
