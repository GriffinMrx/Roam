# Course page (design/vertex-course.png) and home courses from Sanity

## Goal

1. Build the course detail page from `design/vertex-course.png`, wired to the seeded Sanity content. Match the layout, spacing, typography, and states exactly, using the project's current dark and purple tokens instead of the reference's light and orange.
2. Replace the hardcoded course cards on the home page with the seeded courses.
3. Use Haicon v2.0 Twotone icons for every icon on the page, exported from the user's Figma file.

## Skills and docs read

- AGENTS.md: §3 (UI: reproduce exactly, responsive to mobile), §5 (pages read-only, server-only data), §7 (presentational surfaces), §8 (course model, derived numbering)
- sanity-best-practices `image.md` patterns, through the existing `urlFor`
- Next.js 16 docs: caching (`'use cache'`), and `generateStaticParams` with `cacheComponents`

## Code inspected

- `sanity/data.ts`: `getCourses`, `getCourse(slug)`, `getCourseSlugs`. `sanity/lib/queries.ts`: `COURSE_QUERY` returns `outcomes`, `instructor`, `category`, `modules[]{ title, summary, durationSeconds, lessons[]{ slug, title, durationSeconds, freePreview } }`, `lessonCount`, and `durationSeconds`.
- `sanity/lib/image.ts` `urlFor`. `next.config.ts` already allows `cdn.sanity.io`.
- UI kit (`components/ui`): `Badge` (variant `popular`), `buttonStyles` (primary/tertiary, lg), `Breadcrumbs`, `ProgressBar`, `Icon`, `CourseCard`, and `Card`. `SiteHeader`.
- Home (`app/page.tsx`) has a hardcoded `courses` array and decorative footer `bars`.
- Icons: `components/ui/icon.tsx` (Haicon Twotone: `primary` paths, plus `secondary` paths at 40% opacity), sourced from `assets/icons/*.svg`. In those files, the second tone is marked with `opacity="0.4"`.
- Seed data: 10 courses, each with 4 modules of 3 lessons, 4 `learningOutcomes`, and outcome icons `layers, workflow, gauge, rocket, sparkles, shield, puzzle, code`.

## Figma access (blocked)

- `create_session` succeeded. The next call (`get_metadata`) returned the Figma error *"You've reached the Figma MCP tool call limit on the Starter plan"*.
- `whoami` shows the user is on the Starter tier with a View seat. Haicon isn't on npm.
- **User decision:** the user exports the 9 missing icons from Figma as SVG into `assets/icons/`. They are `users`, `layers`, `workflow`, `gauge`, `rocket`, `sparkles`, `shield`, `puzzle`, `code`.
- I convert them into `icon.tsx` with the same rule as the existing ones: paths with `opacity="0.4"` become `secondary`, everything else `primary`. The rest of the page doesn't wait on them. Until each SVG lands, its icon slot renders empty at the correct size, with no stand-in glyphs.

## Page anatomy (from the reference), top to bottom

1. `SiteHeader`, unchanged.
2. Breadcrumbs: "All Courses" (`/#courses`) › course title.
3. Hero, two columns:
   - Left: square cover image, about 280px, `rounded-lg`, from `coverImage` via `urlFor` (`next/image`, priority).
   - Right: `Badge popular` "Popular" (only when `popular`), the title in display type, and the summary in `text-body-lg text-muted`.
   - Meta row with an icon and text for each item: level (`chart`), total duration (`clock`, "18h 24m"), module count (`file`, "4 modules"), and students (`users`, "18.2k students").
   - Actions: primary "Continue Learning →" (`buttonStyles` primary lg + `arrow-right`) and tertiary "Bookmark" (`bookmark` icon).
4. "What you'll learn" panel (bordered surface, `rounded-lg`): a 2×2 grid of bordered tiles. Each tile has a 40px outcome icon in `text-primary-500`, a title (`text-heading-3`), and a description (`text-body text-subtle`).
5. "Course Content": the heading on the left, "N modules • 18h 24m" on the right. Below it, a bordered list of modules, one row each:
   - A numbered circle, then the title and summary, then the module duration and a chevron.
   - Each row expands to list its lessons (title, duration, "Free preview" label), linking to `/lessons/<slug>`. Rows start collapsed, as in the reference.
   - The first 6 modules show. A "Show all N modules ⌄" pill overlapping the list's bottom edge appears only when there are more than 6, so not for the current seed (4 modules each).
6. "Your Progress" bar: a bordered surface with "Your Progress", "0% complete", `ProgressBar` at 0, and "Continue Learning →".
7. The decorative footer bars from the home page, pulled into a shared `components/footer-bars.tsx` and reused here.

Responsive (there's no mobile reference): the hero stacks with the cover on top, the meta row wraps, the outcome grid goes to 1 column, module rows keep the number, title, and chevron and move the duration under the title, and the progress bar stacks.

## Decisions and assumptions

- Route: `app/courses/[slug]/page.tsx`, with `generateStaticParams` from `getCourseSlugs()`, `notFound()` for unknown slugs, and `generateMetadata` for the title and description.
- Derived values are computed in code, never stored: hours and minutes from seconds ("1h 12m", "45m"), module count, numbering by order, and a compact student count ("18.2k").
- **Continue Learning** links to the course's first lesson (`/lessons/<first-lesson-slug>`). The lesson page isn't built yet, so the link 404s until it is.
- **Bookmark:** a presentational button with no backend, consistent with AGENTS.md §7 presentational surfaces.
- **Progress:** progress tracking isn't built. The bar shows **0%** rather than the reference's invented 35%, because the rule is to never invent data. A later progress feature fills it in.
- Module chevrons expand and collapse with a small client component (`components/course-modules.tsx`) using the `aria-expanded` and `aria-controls` button pattern. The data stays server-rendered and is passed in as props.
- Outcome icon keys from Sanity map to `IconName`. Unknown keys render the empty slot.
- **Home:** the course grid becomes an async server section fed by `getCourses()`.
  - `CourseCard` gets two optional props:
    - `media` (a node shown in the tile instead of the monogram): the cover image.
    - `href`: makes the title a link whose `::after` covers the whole card, so the card is clickable while staying valid HTML.
  - Level, duration, and module count come from Sanity. The hardcoded `courses` array is deleted. SpotlightCard styling stays as it is.
- No new packages.

## Files expected to touch

- New: `app/courses/[slug]/page.tsx`, `components/course-modules.tsx`, `components/footer-bars.tsx`, `lib/format.ts` (duration and count formatting)
- Edit: `app/page.tsx`, `components/ui/card.tsx` (`media`, `href`), `components/ui/icon.tsx` (new glyphs once the SVGs arrive)
- No schema, query, or token changes. `COURSE_QUERY` already returns everything the page needs.

## Security considerations

- Pages read only through the server-only data layer. There is no token or client fetch, and the client component gets plain props.
- Images come from `cdn.sanity.io` through `next/image`.

## Acceptance criteria

- `/courses/nextjs-app-router-in-depth` renders:
  - the breadcrumb, cover, Popular badge, title, summary, and meta (Intermediate, total duration, 4 modules, students)
  - 4 outcomes, 4 numbered modules with durations that expand to their 3 lessons, and the progress bar at 0%
- All 10 course slugs build as static pages. An unknown slug returns 404.
- The home grid shows the 10 seeded courses with covers. Each card opens its course page.
- Desktop matches the reference layout. Mobile (390px) stacks without overflow.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome screenshots of `/` and `/courses/nextjs-app-router-in-depth` at 1280 and 390, compared with the reference
- A curl of an unknown slug returns 404

## Manual test steps

1. Open http://localhost:3000. The "All Courses" grid shows 10 courses with cover images.
2. Click "Next.js App Router in Depth". The course page opens.
3. Check the hero (cover, Popular, title, summary, meta, and the two buttons), the 4 outcome tiles, and "Course Content" with 4 modules.
4. Click a module row. Its 3 lessons appear. Click it again to collapse.
5. Narrow the window to phone width. Everything stacks and nothing overflows.
6. Open http://localhost:3000/courses/nope. You get a 404.

## Addendum: full width, the Next.js insight, and icons (follow-up request)

1. **Width.** The course page is capped at `max-w-7xl` with `lg:px-16`, so on wide screens it sits narrower than the full-width header. Remove the cap and use the header's horizontal padding (`px-6 sm:px-10`), so the content spans the screen edge to edge like the header and hero. Inner text keeps its own max widths (summary `max-w-xl`).
2. **Insight** (from the dev overlay console, read through headless Chrome): *Route "/courses/[slug]": Next.js encountered URL data during prerendering or a navigation. `params` … accessed outside of `<Suspense>` may prevent the navigation from being instant.*
   - Fix, following `docs/01-app/02-guides/instant-navigation.md`: the page keeps `SiteHeader`, `<main>`, and `FooterBars` as the instant shell.
   - A `CourseContent` component awaits `params` and the cached `getCourse(slug)` inside `<Suspense fallback={<CourseSkeleton />}>`.
   - The skeleton mirrors the hero, outcomes, and content blocks with muted surfaces, so the layout doesn't shift when the content arrives.
   - `generateStaticParams` stays, so known slugs are still prerendered.
3. **Icons.** The user added 5 Haicon Twotone SVGs to `assets/icons/`. They are converted with the existing rule (`opacity="0.4"` paths become `secondary`) under the names the content uses:
   - `layer.svg` → `layers`
   - `user-group-alt2.svg` → `users`
   - `stars.svg` → `sparkles`
   - `git-branch.svg` → `workflow`
   - `terminal-window.svg` → `code`

   `gauge`, `rocket`, `shield`, and `puzzle` weren't found in the file. Per the user, draw them by hand **in the same style**: 24×24 grid, 1.5px stroke, round caps, the main outline as `primary`, and details as `secondary` at 40% opacity.
   - gauge: open arc, needle, and hub (primary); tick marks (secondary)
   - rocket: body and window (primary); fins and exhaust (secondary)
   - shield: shield outline (primary); check mark (secondary)
   - puzzle: piece outline (primary); the two connector knobs (secondary)

   Save each one as an SVG in `assets/icons/` too, so the folder stays the source of truth.

Checks: type check, lint, and build; the dev overlay console shows no blocking-route error; screenshots at 1280, 1600, and 390; an icon contact sheet comparing the new glyphs with the existing ones.

## Addendum: watch icon on lesson rows (follow-up request)

- In the expanded module, put the existing Haicon `play-circle` icon (18px, `text-muted`, turning `text-primary-500` on row hover) before each lesson title in `components/course-modules.tsx`.
- Lesson titles stay aligned with the module titles. Reduce the row's left padding by the icon width plus the gap (18 + 12px): `pl-18` → `pl-[2.625rem]` on mobile, and `sm:pl-[5.5rem]` → `sm:pl-[3.625rem]`. The icon then sits in the space before the title.
- The icon is decorative (`aria-hidden`). The link text stays the lesson title.
- Checks: type check, lint, and a headless screenshot of an expanded module.

## Addendum: cap the home grid at 6 courses (follow-up request)

- `CourseGrid` in `app/page.tsx` renders at most 6 courses: `HOME_COURSE_LIMIT = 6`, applied with `.slice(0, HOME_COURSE_LIMIT)`.
- `COURSES_QUERY` already orders by `popular desc, title asc`, so popular courses fill the slots first. The query and `getCourses()` don't change, because the full list is still needed for a future catalog page.
- With 6 cards the 3-column grid shows two full rows.
- "View all courses" still links to `#courses`, since there's no catalog page yet.
- Checks: type check, lint, and a count of `/courses/` links on `/` (expect 6).
