"use client";

import Image from "next/image";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SpotlightCard } from "@/components/spotlight-card";
import { CourseCard, Icon, raisedCardShadow, SearchInput } from "@/components/ui";
import { matchScore, searchTokens } from "@/lib/course-match";

/*
 * Instant course filter for the home page. The hero input and the course grid
 * share the query through context, so results update in place as you type.
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
  lessonTitles: string[];
};

const CourseSearchContext = createContext<{
  query: string;
  setQuery: (query: string) => void;
} | null>(null);

function useCourseSearch() {
  const context = useContext(CourseSearchContext);
  if (!context) throw new Error("useCourseSearch must be used inside CourseSearchProvider");
  return context;
}

export function CourseSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <CourseSearchContext.Provider value={{ query, setQuery }}>
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


export function CourseResults({
  courses,
  defaultLimit,
}: {
  courses: CourseSearchItem[];
  defaultLimit: number;
}) {
  const { query, setQuery } = useCourseSearch();
  const trimmed = query.trim();

  const results = useMemo(() => {
    const tokens = searchTokens(trimmed);
    if (tokens.length === 0) return courses.slice(0, defaultLimit);
    return courses
      .map((course, order) => ({ course, order, score: matchScore(course, tokens) }))
      .filter((match): match is typeof match & { score: number } => match.score !== null)
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .map((match) => match.course);
  }, [courses, defaultLimit, trimmed]);

  const clear = (
    <button
      type="button"
      onClick={() => setQuery("")}
      className="text-body font-medium text-primary-500 transition-colors hover:text-primary-600"
    >
      Clear
    </button>
  );

  return (
    <>
      {trimmed && (
        <div className="mt-4 flex items-center gap-4" aria-live="polite">
          <p className="text-body text-muted">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{trimmed}&rdquo;
          </p>
          {results.length > 0 && clear}
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-border px-6 py-14 text-center">
          <Icon name="search" size={32} className="text-subtle" />
          <p className="text-body-lg text-muted">No courses match &ldquo;{trimmed}&rdquo;.</p>
          {clear}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
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
