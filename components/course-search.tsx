"use client";

import Image from "next/image";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SpotlightCard } from "@/components/spotlight-card";
import { CourseCard, Icon, MaybeIcon, raisedCardShadow, SearchInput } from "@/components/ui";
import { cn } from "@/lib/cn";
import { matchScore, searchTokens } from "@/lib/course-match";

/*
 * Instant course filter for the home page. The hero input, the category chips, and the
 * course grid share the query and category through context, so results update in place.
 * This filters courses already on the page; it is not the AI search (AGENTS §11).
 */

/** Public card fields only, serialized from the server. */
export type CourseSearchItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string;
  duration: string;
  modules: number;
  imageUrl?: string;
  category: string;
  categorySlug: string;
  lessonTitles: string[];
};

export type HomeCategory = { slug: string; title: string };

const CourseSearchContext = createContext<{
  query: string;
  setQuery: (query: string) => void;
  /** Selected category slug; "" means all. */
  category: string;
  setCategory: (category: string) => void;
} | null>(null);

function useCourseSearch() {
  const context = useContext(CourseSearchContext);
  if (!context) throw new Error("useCourseSearch must be used inside CourseSearchProvider");
  return context;
}

export function CourseSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  return (
    <CourseSearchContext.Provider value={{ query, setQuery, category, setCategory }}>
      {children}
    </CourseSearchContext.Provider>
  );
}

export function HomeSearchInput({ id }: { id: string }) {
  const { query, setQuery } = useCourseSearch();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <SearchInput
        id={id}
        fieldSize="lg"
        aria-label="Ask anything about your learning"
        aria-controls="courses"
        placeholder="Ask anything about your learning..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}

/** Icons for the home category chips, by category slug. Unknown slugs get an empty slot. */
const CATEGORY_ICONS: Record<string, string> = {
  "": "refresh",
  "ai-engineering": "ai-book",
  "backend-infrastructure": "cloud-database",
  data: "layer",
  languages: "natural-language-generator",
  security: "add-lock",
  "web-development": "code-development",
};

/**
 * Category chips under the hero search (reference: icon + label pills that fade into the
 * background at both edges). The row slides left to right on its own in an endless loop: the
 * chips are rendered twice and the track moves by one copy. It never stops for the mouse; it
 * pauses only while a chip has keyboard focus, and with reduced motion it becomes a sideways scroll.
 */
export function HomeCategoryChips({ categories }: { categories: HomeCategory[] }) {
  const { category, setCategory } = useCourseSearch();
  // Only categories that have a chip icon are shown here (display only; every category still exists).
  const chips = [{ slug: "", title: "All" }, ...categories.filter((c) => c.slug in CATEGORY_ICONS)];

  const chipSet = (copy: boolean) => (
    <div aria-hidden={copy || undefined} className={cn("flex shrink-0 gap-2.5 pr-2.5", copy && "motion-reduce:hidden")}>
      {chips.map((chip) => {
        const active = category === chip.slug;
        return (
          <button
            key={chip.slug || "all"}
            type="button"
            tabIndex={copy ? -1 : undefined}
            aria-pressed={copy ? undefined : active}
            aria-controls={copy ? undefined : "courses"}
            onClick={() => setCategory(chip.slug)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-body font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors",
              active
                ? "border-ink/20 bg-chip-active text-ink"
                : "border-ink/6 bg-chip text-soft-strong hover:border-ink/12 hover:bg-chip-hover",
            )}
          >
            <MaybeIcon name={CATEGORY_ICONS[chip.slug] ?? ""} size={18} className="shrink-0 text-soft" />
            {chip.title}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      role="group"
      aria-label="Filter courses by category"
      className="group/marquee mt-8 overflow-hidden py-1 mask-[linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none] motion-reduce:[&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max animate-marquee group-has-focus-visible/marquee:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:px-[18%]">
        {/* The track starts shifted left by one copy (left-to-right loop), so the real chips go
            second: they are the ones in view at the start and receive keyboard focus. */}
        {chipSet(true)}
        {chipSet(false)}
      </div>
    </div>
  );
}

export function CourseResults({
  courses,
  defaultLimit,
}: {
  courses: CourseSearchItem[];
  defaultLimit: number;
}) {
  const { query, setQuery, category, setCategory } = useCourseSearch();
  const trimmed = query.trim();

  const results = useMemo(() => {
    const tokens = searchTokens(trimmed);
    const inCategory = category ? courses.filter((course) => course.categorySlug === category) : courses;
    if (tokens.length === 0) return category ? inCategory : inCategory.slice(0, defaultLimit);
    return inCategory
      .map((course, order) => ({ course, order, score: matchScore(course, tokens) }))
      .filter((match): match is typeof match & { score: number } => match.score !== null)
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .map((match) => match.course);
  }, [courses, category, defaultLimit, trimmed]);
  const categoryTitle = category ? courses.find((course) => course.categorySlug === category)?.category || "this category" : "";
  const filtered = Boolean(trimmed || category);

  const clear = (
    <button
      type="button"
      onClick={() => {
        setQuery("");
        setCategory("");
      }}
      className="text-body font-medium text-primary-500 transition-colors hover:text-primary-600"
    >
      Clear
    </button>
  );

  return (
    <>
      {filtered && (
        <div className="mt-4 flex items-center gap-4" aria-live="polite">
          <p className="text-body text-muted">
            {results.length} {results.length === 1 ? "result" : "results"}
            {trimmed && <> for &ldquo;{trimmed}&rdquo;</>}
            {category && <> in {categoryTitle}</>}
          </p>
          {results.length > 0 && clear}
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-border px-6 py-14 text-center">
          <Icon name="search" size={32} className="text-subtle" />
          <p className="text-body-lg text-muted">
            No courses match{trimmed && <> &ldquo;{trimmed}&rdquo;</>}
            {category && <> in {categoryTitle}</>}.
          </p>
          {clear}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {results.map((course) => (
            <SpotlightCard key={course.id} flush className="flex" style={raisedCardShadow}>
              <CourseCard
                layout="cover"
                className="flex-1"
                href={`/courses/${course.slug}`}
                title={course.title}
                description={course.summary}
                level={course.level}
                duration={course.duration}
                modules={course.modules}
                cover={
                  course.imageUrl ? (
                    <Image
                      src={course.imageUrl}
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
    </>
  );
}
