"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SavedLessonRow } from "@/app/api/bookmarks/route";
import { BookmarkButton, useSavedIds } from "@/components/bookmark-button";
import { SearchShortcut } from "@/components/search-shortcut";
import { SpotlightCard } from "@/components/spotlight-card";
import {
  AccessBadge,
  buttonStyles,
  CourseCard,
  Icon,
  MaybeIcon,
  ProgressBar,
  raisedCardShadow,
  SearchInput,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { matchScore, searchTokens, type MatchableCourse } from "@/lib/course-match";

/*
 * /courses catalog: instant search, category / level / duration / price filters, and
 * sort, all kept in the URL so reloads, back/forward, and shared links keep the view.
 * Signed in, started courses show the learner's progress (GET /api/progress/courses),
 * and the Saved view (?view=saved) lists bookmarked courses and lessons.
 */

/** Public card fields only, serialized from the server. */
export type CatalogCourse = MatchableCourse & {
  id: string;
  slug: string;
  /** "beginner" | "intermediate" | "advanced" */
  levelKey: string;
  duration: string;
  durationSeconds: number;
  modules: number;
  coverUrl?: string;
  categorySlug: string;
  price: number | null;
  popular: boolean;
  students: number;
  createdAt: string;
};

export type CatalogCategory = { slug: string; title: string; description: string };

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const DURATIONS = [
  { value: "short", label: "Under 2h", test: (s: number) => s < 7200 },
  { value: "medium", label: "2–5h", test: (s: number) => s >= 7200 && s <= 18000 },
  { value: "long", label: "5h+", test: (s: number) => s > 18000 },
];
const PRICES = [
  { value: "free", label: "Free", test: (p: number | null) => !p },
  { value: "paid", label: "Paid", test: (p: number | null) => Boolean(p && p > 0) },
];
const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "shortest", label: "Shortest" },
  { value: "az", label: "A–Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/** Multi-value params are comma separated: ?level=beginner,advanced */
function listParam(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "").split(",").filter(Boolean);
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-body font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.35)]"
          : "bg-white/6 text-[#d4d4d8] ring-1 ring-white/10 ring-inset hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-small font-semibold tracking-widest text-subtle uppercase">{title}</legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function CourseCatalog({
  courses,
  categories,
}: {
  courses: CatalogCourse[];
  categories: CatalogCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { isLoaded, isSignedIn } = useAuth();
  const savedIds = useSavedIds();
  const savedView = params.get("view") === "saved" && Boolean(isSignedIn);
  const category = params.get("category") ?? "";
  const levels = listParam(params, "level");
  const durations = listParam(params, "duration");
  const prices = listParam(params, "price");
  const sortParam = params.get("sort");
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "popular";
  const urlQuery = params.get("q") ?? "";

  // Typing stays instant locally; the URL catches up after a short pause.
  const [query, setQuery] = useState(urlQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Back/forward or Clear changed ?q=: follow it (adjusting state during render).
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== query.trim()) setQuery(urlQuery);
  }

  function update(changes: Record<string, string | string[] | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      const v = Array.isArray(value) ? value.join(",") : value;
      if (v) next.set(key, v);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (query.trim() === urlQuery) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [query]);

  const toggle = (key: string, list: string[], value: string) =>
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });

  const activeFilters = levels.length + durations.length + prices.length;
  const anyFilter = Boolean(category || activeFilters || query.trim());
  const clearAll = () => {
    setQuery("");
    update({ q: null, category: null, level: null, duration: null, price: null });
  };

  // Saved lessons (display rows), fetched when the Saved view opens.
  const [savedLessons, setSavedLessons] = useState<SavedLessonRow[] | null>(null);
  useEffect(() => {
    if (!savedView) return;
    let cancelled = false;
    fetch("/api/bookmarks?details=lessons", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ lessons: SavedLessonRow[] }>) : null))
      .then((body) => !cancelled && body && setSavedLessons(body.lessons))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [savedView]);
  // Unsaving anywhere removes the row right away.
  const visibleSavedLessons = (savedLessons ?? []).filter((l) => savedIds.has(l.id));
  const savedCourseCount = courses.filter((c) => savedIds.has(c.id)).length;

  // Learner progress per course, signed in only.
  const [percents, setPercents] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    fetch("/api/progress/courses", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ percents: Record<string, number> }>) : null))
      .then((body) => !cancelled && body && setPercents(body.percents))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const results = useMemo(() => {
    const tokens = searchTokens(query);
    const matched = courses
      .filter((course) => !savedView || savedIds.has(course.id))
      .map((course, order) => ({ course, order, score: tokens.length ? matchScore(course, tokens) : 0 }))
      .filter((m): m is typeof m & { score: number } => m.score !== null)
      .filter(({ course }) => !category || course.categorySlug === category)
      .filter(({ course }) => !levels.length || levels.includes(course.levelKey))
      .filter(
        ({ course }) =>
          !durations.length ||
          DURATIONS.some((d) => durations.includes(d.value) && d.test(course.durationSeconds)),
      )
      .filter(({ course }) => !prices.length || PRICES.some((p) => prices.includes(p.value) && p.test(course.price)));

    // A search ranks by match unless the learner picked a sort.
    const bySort = (a: (typeof matched)[number], b: (typeof matched)[number]) => {
      switch (sort) {
        case "newest":
          return b.course.createdAt.localeCompare(a.course.createdAt);
        case "shortest":
          return a.course.durationSeconds - b.course.durationSeconds;
        case "az":
          return a.course.title.localeCompare(b.course.title);
        default:
          return Number(b.course.popular) - Number(a.course.popular) || b.course.students - a.course.students;
      }
    };
    const rankBySearch = tokens.length > 0 && !sortParam;
    return matched
      .sort((a, b) => (rankBySearch ? a.score - b.score : 0) || bySort(a, b) || a.order - b.order)
      .map((m) => m.course);
  }, [courses, query, category, levels, durations, prices, sort, sortParam, savedView, savedIds]);

  const selectedCategory = categories.find((c) => c.slug === category);

  const filterGroups = (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Level">
        {LEVELS.map((l) => (
          <Chip key={l.value} active={levels.includes(l.value)} onClick={() => toggle("level", levels, l.value)}>
            {l.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Duration">
        {DURATIONS.map((d) => (
          <Chip
            key={d.value}
            active={durations.includes(d.value)}
            onClick={() => toggle("duration", durations, d.value)}
          >
            {d.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Price">
        {PRICES.map((p) => (
          <Chip key={p.value} active={prices.includes(p.value)} onClick={() => toggle("price", prices, p.value)}>
            {p.label}
          </Chip>
        ))}
      </FilterGroup>
      {anyFilter && (
        <button
          type="button"
          onClick={clearAll}
          className={buttonStyles({ variant: "text", size: "md", className: "self-start" })}
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mt-10">
      {/* All / Saved */}
      <div aria-label="Courses view" className="mb-6 flex gap-2">
        <Chip active={!savedView} onClick={() => update({ view: null })}>
          All courses
        </Chip>
        {isLoaded && !isSignedIn ? (
          <SignInButton>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white/6 px-4 text-body font-medium text-[#d4d4d8] ring-1 ring-white/10 transition-colors ring-inset hover:bg-white/10"
            >
              <Icon name="bookmark" size={16} />
              Saved
            </button>
          </SignInButton>
        ) : (
          <Chip active={savedView} onClick={() => update({ view: "saved" })}>
            <Icon name="bookmark" size={16} className="mr-2" />
            Saved{savedIds.size > 0 && ` (${savedIds.size})`}
          </Chip>
        )}
      </div>

      {/* Search, count, sort */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <form role="search" className="flex-1" onSubmit={(e) => e.preventDefault()}>
          <SearchInput
            id="catalog-search"
            fieldSize="lg"
            aria-label="Search courses"
            placeholder="Search courses, topics, or lessons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchShortcut targetId="catalog-search" />
        </form>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <p className="text-body text-muted tabular-nums" aria-live="polite">
            {results.length} {savedView ? "saved " : ""}
            {results.length === 1 ? "course" : "courses"}
          </p>
          <label className="flex items-center gap-2">
            <MaybeIcon name="sort" size={20} className="text-subtle" />
            <span className="sr-only">Sort by</span>
            <div className="w-44">
              <Select
                value={sort}
                onChange={(e) => update({ sort: e.target.value === "popular" ? null : e.target.value })}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </label>
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-6 -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Chip active={!category} onClick={() => update({ category: null })}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} active={category === c.slug} onClick={() => update({ category: c.slug })}>
            {c.title}
          </Chip>
        ))}
      </div>
      {selectedCategory?.description && (
        <p className="mt-4 max-w-2xl text-body-lg text-muted">{selectedCategory.description}</p>
      )}

      {/* Mobile filters toggle */}
      <button
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        onClick={() => setFiltersOpen((v) => !v)}
        className={buttonStyles({ variant: "tertiary", className: "mt-6 lg:hidden" })}
      >
        <MaybeIcon name="filter" size={20} />
        Filters{activeFilters > 0 && ` (${activeFilters})`}
        <Icon name="chevron-down" size={18} className={cn("text-muted transition-transform", filtersOpen && "rotate-180")} />
      </button>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside
          id="catalog-filters"
          aria-label="Filters"
          className={cn("shrink-0 lg:block lg:w-60", filtersOpen ? "block" : "hidden")}
        >
          {filterGroups}
        </aside>

        <div className="min-w-0 flex-1">
          {savedView && savedIds.size === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-14 text-center">
              <Icon name="bookmark" size={32} className="text-primary-500" />
              <p className="text-heading-3 text-foreground">Nothing saved yet</p>
              <p className="max-w-sm text-body text-muted">
                Use the bookmark on any course or lesson to keep it here.
              </p>
              <button type="button" onClick={() => update({ view: null })} className={buttonStyles({ variant: "glossy" })}>
                Browse all courses
              </button>
            </div>
          ) : savedView && savedCourseCount === 0 ? null : results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-14 text-center">
              <Icon name="search" size={32} className="text-subtle" />
              <p className="text-body-lg text-muted">No courses match your filters.</p>
              <button type="button" onClick={clearAll} className={buttonStyles({ variant: "glossy" })}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((course) => {
                const percent = percents[course.id];
                return (
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
                        course.coverUrl ? (
                          <Image
                            src={course.coverUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 40vw, 100vw"
                            className="object-cover"
                          />
                        ) : undefined
                      }
                      coverOverlay={<BookmarkButton id={course.id} variant="overlay" />}
                      footer={
                        percent !== undefined ? (
                          <div className="flex items-center gap-3">
                            <ProgressBar
                              value={percent}
                              showLabel={false}
                              label={`${course.title} progress`}
                              className="flex-1"
                            />
                            <span className="shrink-0 text-small text-muted tabular-nums">{percent}% complete</span>
                          </div>
                        ) : undefined
                      }
                    />
                  </SpotlightCard>
                );
              })}
            </div>
          )}

          {savedView && visibleSavedLessons.length > 0 && (
            <section aria-labelledby="saved-lessons-title" className={savedCourseCount > 0 ? "mt-12" : undefined}>
              <h2 id="saved-lessons-title" className="text-heading-2 text-foreground">
                Saved lessons
              </h2>
              <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
                {visibleSavedLessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                    <span
                      aria-hidden
                      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-black text-heading-2 font-semibold text-white"
                    >
                      {lesson.thumbUrl ? (
                        <Image src={lesson.thumbUrl} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        lesson.title.charAt(0)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small text-subtle">
                        {lesson.courseTitle}
                        {lesson.label && ` · ${lesson.label}`}
                      </p>
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="mt-0.5 block truncate text-body-lg text-foreground transition-colors hover:text-primary-400"
                      >
                        {lesson.title}
                      </Link>
                    </div>
                    <span className="hidden sm:inline">
                      <AccessBadge free={lesson.freePreview} />
                    </span>
                    <span className="hidden text-body text-subtle tabular-nums md:inline">{lesson.duration}</span>
                    <BookmarkButton id={lesson.id} variant="icon" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
