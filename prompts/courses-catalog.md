# Courses catalog page (`/courses`)

## Goal
A dedicated, **public** catalog of every course, reached from the navbar "Courses", the home "View all courses" and "Explore Courses", and the "All Courses" breadcrumbs. It has:
1. **Instant search** (same matching as the home filter) and a result count.
2. **Filters:**
   - category chips, with the selected category's description
   - level (Beginner, Intermediate, Advanced)
   - duration (under 2h, 2–5h, 5h+)
   - price (Free, Paid; display only)
3. **Sort:** Most popular (default), Newest, Shortest, A–Z.
4. **Personal touches when signed in:** a progress bar with "40% complete" on cards for started courses, and a bookmark button on every card.
5. **Shareable state:** search, filters and sort live in the URL (`/courses?category=ai&level=beginner&sort=newest`).
6. **Empty state:** "No courses match" with Clear filters.
7. **Mobile:** the filters collapse behind a "Filters" button.

Decisions taken from my recommendations, which the user accepted:
- The catalog is public; course detail pages stay behind sign-in.
- The home page keeps its 6-course teaser.
- No "Continue learning" row, because My Learning covers it.

## Icons
These render empty via `MaybeIcon` until the user uploads duotone solid SVGs to `assets/icons/`:
- `filter`: the mobile Filters button
- `sort`: the sort control

## Skills and docs read
- AGENTS.md:
  - §5: server-only data; per-user reads go through a server route.
  - §7: browsing stays public; private state is keyed by Clerk id.
  - §12: protected routes are handled in the proxy.
- sanity-best-practices (GROQ projection, TypeGen).
- Next 16: `useSearchParams` in a client component needs a `<Suspense>` boundary under `cacheComponents`; `router.replace` with `scroll: false`.

## Code inspected
- `proxy.ts`: `"/courses(.*)"` also matches `/courses` itself, so the catalog would be gated.
- `sanity/lib/queries.ts` `COURSES_QUERY`: has title, slug, summary, cover, level, price, popular, category, counts, duration and lesson titles. It has no creation date.
- `CATEGORIES_QUERY` and `getCategories()`: title, slug and description. Not used yet.
- `components/course-search.tsx`: home instant filter with a token score function (title, then category, then summary and level, then lesson titles).
- `components/ui/card.tsx` `CourseCard layout="cover"`, `components/spotlight-card.tsx` (flush), `raisedCardShadow`, `ProgressBar` (silver), `Select` (native select field), `buttonStyles` glossy variants.
- `components/bookmark-button.tsx`: icon variant with a bordered square.
- `sanity/progress.ts`, `app/api/progress/route.ts`: per-course progress GET.
- `components/site-header.tsx`: nav items, and an `active` key.
- Links to `/#courses` in the header, the home hero and its "View all", breadcrumbs (course, lesson, instructor), and the My Learning empty state.

## Decisions
- **Access:** change the proxy page matcher to `"/courses/(.*)"`. Detail pages stay gated and `/courses` becomes public.
- **Route:** `app/courses/page.tsx`, a server component.
  - It fetches `getCourses()` and `getCategories()` (both cached server-side).
  - It maps them to plain card view models (16:9 cover URL; price, level, duration and created timestamp).
  - It renders the client `CourseCatalog` inside `<Suspense>` with a skeleton.
  - The page frame matches My Learning: `max-w-7xl`, `text-display-1` title "All Courses", and a muted subtitle.
- **Query:** add `_createdAt` to `COURSES_QUERY` for Newest, then regenerate types.
- **Shared matching:** move the token score function to `lib/course-match.ts` and use it from both the home filter and the catalog. Home behavior is unchanged.
- **Client `components/course-catalog.tsx`:**
  - State is read from `useSearchParams` and written with `router.replace(…, { scroll: false })`. The search input is local state, debounced about 200ms into the URL so typing stays instant.
  - Filtering is AND across groups, OR within the multi-select level group, single-select for category.
  - Duration buckets are under 2h (`< 7200` seconds), 2–5h, and 5h+. Price buckets are Free (`price == 0` or null) and Paid.
  - Sort: popular (popular first, then student count), newest (`_createdAt` descending), shortest (duration ascending), A–Z. With a search query, ranking falls back to match score unless the user picked a sort.
- **Layout:**
  - **Top:** a search field (`SearchInput` lg) on the left; on the right, the "N courses" count and the Sort select (`sort` icon).
  - **Category chips** row:
    - The active chip is a glossy gray pill.
    - Inactive chips are `bg-white/[0.06] ring-white/10`.
    - The selected category's description shows below the row.
  - **Desktop (`lg`):** a left filter column (`w-60`) with Level, Duration and Price as toggle chips, a "Clear filters" text button, and the grid on the right (`md:grid-cols-2 xl:grid-cols-3`).
  - **Mobile:** a "Filters (n)" button (`filter` icon) toggles the same filter groups inline above the grid.
- **Cards:** the same cover cards as home (SpotlightCard flush plus `CourseCard layout="cover"`), extended with two optional slots on `CourseCard`:
  - `coverOverlay`: a bookmark button top-right of the cover, on a translucent dark square with blur. This is a new `overlay` variant of `BookmarkButton`, positioned above the card's stretched link.
  - `footer`: for started courses only, the silver `ProgressBar` with "40% complete".
- **Progress for cards:** a new `GET /api/progress/courses` returns `{ [courseId]: percent }` for the signed-in learner. It is computed server-side from progress docs and course structure (new `readCoursePercents(userId)` in `sanity/progress.ts`), with `no-store` and Clerk `auth()`. It is already 401-protected by the `/api/progress(.*)` proxy matcher. The client fetches it once when signed in. Signed out, nothing loads and no bars show.
- **Links:**
  - The navbar "Courses" goes to `/courses`, and is active on the catalog.
  - The home "View all courses", the hero "Explore Courses", the breadcrumbs "All Courses" and the My Learning "Browse all courses" go to `/courses`.
  - The home page keeps its `#courses` section with 6 cards.

## Files
- `proxy.ts`
- `sanity/lib/queries.ts`, `sanity.types.ts`, `sanity/progress.ts`
- `app/api/progress/courses/route.ts` (new)
- `app/courses/page.tsx` (new)
- `components/course-catalog.tsx` (new)
- `lib/course-match.ts` (new), `components/course-search.tsx`
- `components/ui/card.tsx` (`coverOverlay`, `footer`), `components/bookmark-button.tsx` (`overlay` variant)
- `components/site-header.tsx`, `app/page.tsx`
- `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`, `app/instructors/[slug]/page.tsx`, `app/my-learning/page.tsx` (breadcrumbs and links)

## Security
- The catalog shows only public card fields.
- Per-user percents come from a server route keyed to the Clerk session, uncached, and 401 when signed out.
- Bookmark writes use the existing protected route. No tokens reach the browser.

## Acceptance
- Signed out, `/courses` loads (200) and shows every course. Course detail pages still redirect to sign-in.
- Search, chips, level, duration, price and sort all narrow or reorder instantly. The URL updates and reloading keeps the state. Back and forward work.
- The count is correct, and the empty state with Clear filters appears when nothing matches.
- Signed in: started courses show the silver progress bar and %. The bookmark on a card toggles Saved without opening the course.
- The nav "Courses" is highlighted on `/courses`, and every "All Courses" link lands there.
- Mobile: filters are behind the button and the grid is one column.

## Checks
- `npm run typegen` (studio), `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live, signed out: `/courses` returns 200, `/courses/<slug>` returns 307, and `/api/progress/courses` returns 401.

## Manual test
1. `npm run dev`. Signed out, click "Courses" in the navbar and check that all courses show.
2. Type in search, pick a category chip (its description appears), toggle levels, duration and price, and change the sort. Check that the URL changes, then reload and check the state is kept.
3. Pick filters that match nothing, check the empty state, and click Clear filters.
4. Sign in. Started courses show a progress bar. Click the bookmark on a card: it shows Saved and the course doesn't open.
5. Narrow the window to mobile width, open Filters and apply some.
6. Check that the breadcrumbs "All Courses" and the home "View all courses" lead to `/courses`.
