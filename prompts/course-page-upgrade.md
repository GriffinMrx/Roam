# Course page upgrade: instructor, progress, sticky panel, bookmarks, free and premium

## Goal
Implement everything recommended for the course page, plus the user's decisions:
1. An **instructor card** on the course page, an instructor line on the lesson page, and a new **instructor page** at `/instructors/[slug]`.
2. **Progress moved up**, under the hero: % complete, a progress bar, and "Next up: Lesson 3.2 · title". The bottom "Your Progress" panel goes away.
3. **Module list progress:** lesson numbers ("3.2"), "2 of 4" completion per module, the current module open by default, and checks (already there).
4. **Sticky side panel** on desktop: cover, **price label**, Continue, Bookmark, and course details. It stacks on mobile.
5. **More in this category:** 3 related courses as cover cards.
6. **Bookmarks, built for real:** save or unsave courses (course page) and lessons (lesson page) through a server route, with a Saved state on the button and a **Saved** section on My Learning.
7. **Free and Premium:**
   - Free-preview lessons can be watched **without signing in**. All other lessons still require sign-in.
   - Lessons carry a **Free preview** or **Premium** label.
   - Premium is a **mock**: a label only, with no payment, so any signed-in user can watch every lesson.

Design follows what the user has approved so far: dark surfaces, the glossy gray pill buttons, cover cards with a raised panel, the silver glowing progress bar, and duotone filled icons.

## Icons
New icons are rendered with `MaybeIcon`, which shows an **empty placeholder** until the SVG is uploaded. The user will upload duotone solid SVGs to `assets/icons/`, then I add them to `components/ui/icon.tsx` as filled glyphs.
- `graduation-cap`: the instructor section heading and the instructor page expertise
- `book-open`: the lessons count in the side panel, and the courses count on the instructor page
- `crown`: the Premium label
- `tag`: the price in the side panel

Existing icons are reused: `user`, `clock`, `chart`, `folder`, `bookmark`, `check-circle`, `play-circle`, `arrow-right`.

## Skills and docs read
- AGENTS.md:
  - §5: the browser never writes, and writes go through server routes with a server-only token.
  - §7: per-user state is keyed by Clerk id and kept apart from content. Free preview was a label; the user has now decided it means real free access.
  - §8: an instructor has a name, slug, photo, expertise and bio, and needs its own page.
  - §12: private routes are protected in the proxy.
- sanity-best-practices (GROQ, reverse references, TypeGen, Portable Text plain text).
- Next 16: `cacheComponents` (auth inside Suspense), `generateStaticParams`, and `proxy.ts`.

## Code inspected
- `app/courses/[slug]/page.tsx`: hero (cover, title, meta, LearnButton plus a dead Bookmark), outcomes, CourseModules, and ProgressSummary at the bottom.
- `components/course-modules.tsx`: module rows, lesson rows, checks, and a "Free preview" text label. All modules start closed.
- `components/course-progress.tsx` and `course-progress-ui.tsx`: the client progress context from `/api/progress` (status, percent, target, doneLessons and doneModules), plus LearnButton and ProgressSummary.
- `sanity/lib/queries.ts`:
  - `COURSE_QUERY` has the instructor (no bio) and the category.
  - `INSTRUCTOR_QUERY` and `INSTRUCTOR_SLUGS_QUERY` exist but are unused.
  - `LESSON_QUERY` has the course instructor.
- `studio/schemaTypes`: instructor (expertise is a string array, bio is blockContent), course price (USD, 0 means free), and progress (read-only app-state type).
- `app/api/progress/route.ts`: the pattern for a Clerk-authenticated, same-origin, Zod-validated server write.
- `proxy.ts`: gates `/courses`, `/lessons`, `/my-learning`, and returns 401 for `/api/progress`.
- `app/my-learning/page.tsx`, `sanity/my-learning.ts`.
- `components/ui/badge.tsx` (variants), `components/portable-text.tsx`.

## Decisions

### Free and Premium access (`proxy.ts`)
- `/lessons/<slug>` stays gated **unless the slug is free preview**.
- The proxy reads the set of free-preview lesson slugs with the server Sanity client and caches it in memory for 5 minutes. If the read fails, the lesson stays gated (fail closed).
- `/courses/*` stays gated, as the user asked earlier. Free lessons are reached by direct or shared link (for example the player's copy-link chip).
- When a signed-out user is on a free lesson:
  - the player works
  - progress isn't saved (the existing "Sign in to save progress")
  - Bookmark becomes a sign-in prompt
  - sidebar links to the course or other lessons lead to sign-in
- **Labels:**
  - New `Badge` variants: `free` (silver) and `premium` (purple, with the `crown` icon).
  - The course module list shows Free preview or Premium on every lesson row.
  - The lesson page header shows the lesson's label.
  - Premium never blocks a signed-in user.

### Bookmarks
- **Storage:** one app-state doc per learner, `bookmarks.<userId>`, of `_type: "bookmarks"`. It holds `items[]`, each `{ _key, kind: "course" | "lesson", ref (weak reference), savedAt }`. It is kept apart from content, as progress is. I'll add a read-only `bookmarks` schema type to the Studio (like `progress`) for typegen and inspection.
- **Route** `app/api/bookmarks/route.ts`:
  - `GET` returns the learner's saved ids.
  - `POST {id, saved}` adds or removes an item. The same checks as progress apply: Clerk `auth()`, same-origin, JSON, Zod id regex (`course.…` or `lesson.…`), and a check that the document exists and is of that kind. The write uses the server write token.
  - `/api/bookmarks(.*)` is added to the proxy's 401 API matcher.
- **Client** `components/bookmark-button.tsx`:
  - Loads the state from GET (one request per page) and toggles optimistically. The label switches between Bookmark and Saved, and the icon tints.
  - When signed out it wraps Clerk's `SignInButton`.
  - It replaces the dead buttons on the course and lesson pages.
- **My Learning:** a **Saved** section listing saved courses (cover cards) and saved lessons (compact rows with course name and a "Lesson M.L" label), read server-side for the session's user.

### Course page layout
- **Desktop (`lg`):** two columns. The main column holds breadcrumbs, the hero text (popular badge, title, summary), progress, outcomes, content, instructor and related courses. A sticky `aside` (`top-28`, below the h-24 sticky header) holds:
  - the cover image, 16:9, in a raised card in the cover-card style
  - the price row (`tag` icon, "$49" or "Free" when 0)
  - Continue Learning (glossy pill, full width) and Bookmark
  - a details list: level, duration, modules, lessons (`book-open`), students
- **Mobile:** the aside renders right after the hero text, not sticky, full width.
- **Progress strip** (client, from context, under the hero text):
  - Started: "Your Progress · 40% complete", the silver bar, and "Next up: Lesson 3.2 · Title" linking to the resume target.
  - Signed in but not started: "Start with Lesson 1.1 · Title".
  - Hidden while loading.
  - `ProgressSummary` is removed.

### Module list (`course-modules.tsx`)
- Lesson rows show "3.2" before the title.
- Module rows show "2 of 4 lessons" (or "Completed").
- When progress loads, the module holding the resume target opens automatically (once).

### Instructor
- `COURSE_QUERY` adds the instructor `bio` and a `related` projection: up to 3 courses in the same category, excluding this one, popular first.
- **Course page "Your instructor" section:** a raised card with photo (round), name (links to the profile), expertise chips, a ~240-character plain-text bio excerpt, and a "View profile →" text link.
- **Lesson page:** in the meta row, the instructor's small photo and name, linking to the profile.
- **New `app/instructors/[slug]/page.tsx`**, public (marketing info, no lessons) with `generateStaticParams`:
  - Hero: large photo, name (`text-display-1`), expertise chips, and stats (courses, lessons, students).
  - "About": the bio through the existing `PortableText`.
  - "Courses by <name>": a cover card grid.
  - A skeleton fallback, and breadcrumbs "All Courses / Instructors / Name".
  - `INSTRUCTOR_QUERY` adds the cover and counts for the cards and stats.

### More in this category
- A "More in <Category>" section of 3 cover cards (SpotlightCard flush plus `CourseCard layout="cover"`). It is hidden when there are none.

## Files
- `proxy.ts`
- `sanity/lib/queries.ts`, `sanity.types.ts` (regenerated)
- `sanity/bookmarks.ts` (new, server-only read), `sanity/my-learning.ts`
- `app/api/bookmarks/route.ts` (new)
- `studio/schemaTypes/documents/bookmarks.ts` (new), `studio/schemaTypes/index.ts`
- `app/courses/[slug]/page.tsx`
- `components/course-modules.tsx`, `components/course-progress-ui.tsx`
- `components/bookmark-button.tsx` (new)
- `app/lessons/[slug]/page.tsx`
- `app/instructors/[slug]/page.tsx` (new)
- `app/my-learning/page.tsx`
- `components/ui/badge.tsx`

## Security
- **Bookmarks:** the user comes only from the Clerk session; same-origin, JSON-only and Zod-validated; the target must exist and match its kind; the write token stays server-only; the API is 401 when signed out; reads are `no-store` per user.
- **Free preview bypass:** decided server-side from Sanity data (it can't be spoofed from the URL), and fails closed. Only free-preview lessons are opened.
- No token or raw documents reach the browser. Progress writes are unchanged.

## Acceptance
- **Course page:**
  - The sticky aside shows the cover, price, Continue, Bookmark and details on desktop, and stacks on mobile.
  - The progress strip and "Next up" appear under the hero once started.
  - The module list shows numbers, per-module counts and labels, and auto-opens the current module.
  - The instructor card links to the profile, and related courses show.
- `/instructors/<slug>` renders the profile, bio and courses.
- **Bookmarks:** toggling shows Saved, survives a reload, and appears under Saved on My Learning. The lesson bookmark works too.
- **Free and Premium:**
  - Signed out, a free-preview lesson plays and a premium lesson redirects to sign-in.
  - Signed in, every lesson plays.
  - The labels show.
- The 4 new icons render as empty space until uploaded, and the layout doesn't break.

## Checks
- `npm run typegen` (studio), `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live checks against a production server:
  - Signed out: a free lesson returns 200 and a premium lesson returns 307 to sign-in.
  - `/api/bookmarks` returns 401 when signed out.
  - `/instructors/<slug>` returns 200.

## Manual test
1. `npm run dev`, sign in, open a course.
   - Check the sticky aside on desktop and the stacking on mobile.
   - Check the progress strip and Next up.
   - Expand the modules and check numbers, counts and labels.
   - Check the instructor card and related courses.
2. Click Bookmark. It shows Saved. Reload: still Saved. Open My Learning: it's under Saved. Unsave and check it's gone.
3. Bookmark a lesson from the lesson page and check My Learning.
4. Open the instructor profile from the course page and from the lesson page.
5. Sign out:
   - Open a free-preview lesson URL. It plays, and Bookmark asks you to sign in.
   - Open a premium lesson URL. It redirects to sign-in.
6. Upload `graduation-cap.svg`, `book-open.svg`, `crown.svg` and `tag.svg` to `assets/icons/` and tell me. I'll wire them in.
