# My Learning page

## Goal
Build `/my-learning`, the signed-in learner's dashboard, from progress that is already stored. It has:
1. A **Continue where you left off** hero for the most recent unfinished lesson. It resumes at the saved second.
2. A **stats strip**: lessons completed, courses finished, time watched.
3. **In progress**: started courses, most recently active first. Each shows % complete, "Module X of Y" and a Continue button.
4. **Completed**: finished courses in a quieter style with a Review link.
5. An **empty state** for new learners, with popular courses and a link to the catalog.

The page is read-only (AGENTS §7 lists My Learning as presentational, reading existing progress). There is no bookmarks tab, because bookmarks don't save anything yet.

## Skills and docs read
- AGENTS.md §5 (server-only data, private token), §7 (My Learning is presentational; progress is keyed by Clerk user id), §12 (protect private routes in the proxy).
- sanity-best-practices (GROQ projections, dereferencing, TypeGen).
- Next 16 `cacheComponents`: per-request data (`auth()`) must sit inside `<Suspense>`.

## Code inspected
- `sanity/progress.ts`, `lib/progress.ts`:
  - There is one `progress` doc per learner per course (`progress.<userId>.<courseKey>`).
  - Each doc holds `lessons[]` (lesson ref, position, duration, completed), `lastLesson`, `lastPosition` and `updatedAt`.
  - Helpers exist: `completedLessonIds`, `coursePercent`, `resumeTarget`, `savedStart`.
- `app/api/progress/route.ts`: the only write path. It is unchanged.
- `app/courses/[slug]/page.tsx`: page frame (SiteHeader, main padding, FooterBars), Suspense with a skeleton, `Meta`, Breadcrumbs.
- `app/page.tsx` and `components/course-search.tsx`: the SpotlightCard and CourseCard grid.
- `components/course-progress-ui.tsx`: the gray glossy `LearnButton` pill.
- `components/ui/*`: ProgressBar, Badge, Icon, buttonStyles, Navbar (supports `active`).
- `components/site-header.tsx`: "My Learning" currently links to `#`.
- `proxy.ts`: already gates `/courses` and `/lessons`.

## Decisions
- **Route and gating:** add `app/my-learning/page.tsx` and add `/my-learning(.*)` to the protected-page matcher in `proxy.ts`. A signed-out visit goes to sign-in, then back to the page.
- **Navigation:** the "My Learning" nav item links to `/my-learning`. `SiteHeader` gets an optional `active` prop, so the item is highlighted on this page.
- **Data** (new `sanity/my-learning.ts`, `server-only`):
  - One no-store query for `*[_type=="progress" && userId==$userId] | order(updatedAt desc)`.
  - It dereferences each course: title, slug, cover, level, and modules with lessons (id, title, slug, duration, thumbnail, videoUrl).
  - `userId` comes only from Clerk `auth()` on the server.
  - The result is mapped to plain view models on the server, and only display fields reach the client.
- **Rules:**
  - A course counts as **started** if any lesson entry is completed or has position > 0.
  - **Finished** means `coursePercent === 100`.
  - **In progress** means started and not finished, ordered by `updatedAt` descending.
  - The **hero** is the `resumeTarget` of the most recently updated in-progress course: its lesson, saved second and lesson duration. The label is `Lesson M.L` from module and lesson order.
  - **Time watched** is the sum over lesson entries of `completed ? duration : position`, formatted with `formatDuration`.
  - Progress for a course that no longer exists (a broken weak reference) is skipped.
- **Design** (reuse what exists; there is no reference image):
  - Page frame like the course page: `SiteHeader`, `main px-6 pt-8 sm:px-10`, `FooterBars`, and a `max-w-7xl` container as on home. The title "My Learning" uses `text-display-1` with a muted subtitle.
  - **Hero:** a bordered `rounded-lg bg-surface` card in two columns, stacking on mobile.
    - Left: the lesson poster (lesson thumbnail, then the YouTube frame, then the course cover) with the white round play button from the lesson page's poster style, linking to the lesson at `?t=`.
    - Right: the course title in small muted text, `Lesson 3.2 · <title>` as `text-heading-1`, a ProgressBar for the lesson with "12:40 of 18:00", and a glossy gray **Continue Learning** pill.
  - **Stats strip:** three bordered tiles with an icon (check-circle, folder, clock), a large number and a muted label.
  - **In progress:** a `md:grid-cols-3` grid of `SpotlightCard`s, each with:
    - the cover tile and course title
    - a level meta line
    - "Module X of Y"
    - a ProgressBar with % complete
    - a Continue pill
  - **Completed:** compact rows with a cover thumb, title, a check-circle "Completed" label, and a text "Review" link to the course page.
  - **Empty state:** a centered panel ("You haven't started a course yet"), then a "Popular courses" grid of the first 3 courses using the exact home card (SpotlightCard and CourseCard stacked), then a "Browse all courses" link to `/#courses`.
  - A skeleton fallback in the same structure as the loaded page.
- **Shared style:** the gray glossy pill moves into `buttonStyles` as a new `glossy` variant, so `LearnButton` and this page share it. `LearnButton`'s look is unchanged.
- **Out of scope:** bookmarks, remove or reset actions, streaks and badges.

## Files
- `app/my-learning/page.tsx` (new)
- `sanity/my-learning.ts` (new), `sanity.types.ts` (regenerated)
- `components/ui/button.tsx` (`glossy` variant), `components/course-progress-ui.tsx` (uses it)
- `components/site-header.tsx` (link and `active` prop)
- `proxy.ts` (gate `/my-learning`)

## Security
- The route is protected in the proxy, and the page still calls `auth()` and returns no data without a `userId`.
- Progress is read only for the session's user id, server-side, uncached (`no-store`), with the existing server token.
- No new write path. No token or raw documents reach the browser.

## Acceptance
- Signed out, `/my-learning` redirects to sign-in and comes back afterwards.
- A new learner sees the empty state with 3 popular courses.
- After watching part of a lesson:
  - the hero shows that lesson, and Continue opens it at the saved second
  - the course appears under In progress with the correct % and module
  - the stats are correct
- A finished course moves to Completed.
- The nav item is highlighted on this page.
- The layout stacks cleanly on mobile.

## Checks
- `npm run typegen` (studio), `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. `npm run dev`. Signed out, open `/my-learning`. You should be sent to sign-in and returned afterwards.
2. As a new user, check the empty state and the popular courses.
3. Watch about 30s of a lesson, then open My Learning. Check the hero, the In progress card and the stats. Click Continue: the lesson opens at the saved second.
4. Finish all lessons of a short course, or check with an account that has. It shows under Completed.
5. Resize to mobile width and check that the hero and grids stack.

## Found during implementation
- `cn()` only joins classes and does not merge conflicting Tailwind utilities. The earlier Sign in and Learn pills put `rounded-full`, `border-[#…]` and similar on top of `rounded-md` and `border-border`, and the built CSS order made the defaults win, so neither was actually a pill.
- Fix: two `buttonStyles` variants, `glossy` (gray) and `glossy-light` (white). They set their own radius, size and border, and `buttonStyles` skips the default `rounded-md` and size classes for them. The Sign in button uses `glossy-light`, and `LearnButton` and My Learning use `glossy`.
