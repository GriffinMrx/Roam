# Saved view in the courses catalog, clearer lesson bookmarking, new icons

## Goal
1. **Saved in the courses section.**
   - `/courses` gets an **All courses / Saved (n)** switch.
   - Saved shows the learner's bookmarked **courses** (same cover cards, with the filters and sort still applying) and their bookmarked **lessons** (rows with course name, "Lesson M.L", duration and access label).
   - It is shareable as `/courses?view=saved`.
   - Signed out, Saved prompts sign-in.
2. **Lesson page bookmarking that clearly works.**
   - Saving already works: the user's account has two saved lessons in the dataset.
   - The lesson-page button is icon-only, and its saved state is too subtle. It becomes a labelled **Bookmark / Saved** button with a clear saved style.
   - Bookmark state is shared live across every button and the Saved view, so unsaving anywhere updates everywhere without a reload.
3. **Icons:** wire in the uploaded SVGs.

## Icons
- Uploaded:
  - `crown.svg` → `crown`
  - `openbook.svg` → `book-open` (the name the code uses)
  - `check-circle.svg` (redrawn) → `check-circle`
  - All are converted to filled duotone glyphs: the 40%-opacity layer becomes `secondary` and the solid layer becomes `primary`. `crown.svg` contains only a 40% layer, so it renders as the soft tone only, as drawn.
- **Still missing**, and they stay empty: `graduation-cap.svg`, `tag.svg`, `filter.svg`, `sort.svg`.

## Code inspected
- `components/bookmark-button.tsx`: per-button state plus a module-level promise of saved ids. Buttons don't hear about each other's changes.
- `app/api/bookmarks/route.ts` (GET ids, POST toggle), `sanity/bookmarks.ts` (`readBookmarkIds`, `readSaved` with lesson details).
- `components/course-catalog.tsx` (URL state, chips, grid), `app/courses/page.tsx`.
- `app/lessons/[slug]/page.tsx`: uses `<BookmarkButton variant="icon" />` next to the title.
- `components/ui/icon.tsx`: the filled-glyph support added for the clock.
- Live dataset check: the lesson and course ids all pass the bookmark id format, and one bookmarks doc holds 2 lesson items. Saving works.

## Decisions
- **Shared bookmark store** (in `bookmark-button.tsx`):
  - A tiny client store: a Set of saved ids, plus subscribers, read with `useSyncExternalStore`.
  - It loads once from `GET /api/bookmarks` when signed in, and is updated optimistically on toggle (rolled back on failure).
  - Exports `useSavedIds()` for the catalog. `BookmarkButton` reads from the store instead of local state.
- **Saved lessons data:** `GET /api/bookmarks?details=lessons` also returns the saved lessons as display view models. These come from `readSaved()` and are mapped server-side to slug, title, course title, "Lesson M.L" label, formatted duration, `freePreview`, and course thumbnail URL. The plain GET is unchanged.
- **Catalog:**
  - A segmented switch above the search: "All courses" | "Saved (n)", styled like the category chips (the active one is the glossy pill).
  - `view=saved` in the URL.
  - In Saved, the course grid shows only saved courses (with search, filters and sort still applying). Under it, a "Saved lessons" list in rows, as on My Learning, fetched once when the view opens. Unsaving a card removes it right away.
  - Empty Saved: "Nothing saved yet. Use the bookmark on any course or lesson." with a "Browse all courses" button that switches back to All.
  - Signed out: the Saved tab opens Clerk sign-in.
- **Lesson page:** the button next to the title switches to the `full` variant (bookmark icon plus "Bookmark" or "Saved"). Saved state shows a purple-tinted icon and border (`border-primary-300`, `bg-primary-100/40`). The saved styling lives in the button's own class list, not as an override, so there are no `cn()` conflicts. On mobile it stays beside the title.

## Files
- `components/ui/icon.tsx`
- `components/bookmark-button.tsx`
- `app/api/bookmarks/route.ts`
- `components/course-catalog.tsx`
- `app/lessons/[slug]/page.tsx`

## Security
- Unchanged model: bookmarks are read and written only through the Clerk-authenticated server route, keyed to the session user, with `no-store`.
- The details response holds only display fields for the user's own saved lessons.

## Acceptance
- On `/courses`, signed in, Saved shows the bookmarked courses and lessons with a correct count. Unsaving a card removes it immediately. `?view=saved` survives a reload.
- Signed out, clicking Saved opens sign-in.
- On the lesson page, clicking Bookmark turns it into "Saved" visibly, and the lesson appears under Saved on `/courses` and on My Learning.
- The crown, book-open and check-circle icons render in the duotone filled style. The four missing icons still leave empty space.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live: `/api/bookmarks?details=lessons` returns 401 when signed out, and `/courses?view=saved` returns 200.

## Manual test
1. Sign in, open `/courses`, click "Saved". Your 2 saved lessons are listed.
2. Bookmark a course card. The Saved count goes up and the card shows in Saved. Unsave it there and it disappears.
3. Open a lesson, click Bookmark. It reads "Saved". Go to `/courses?view=saved` and check that the lesson is there.
4. Sign out and click Saved. You should get the sign-in prompt.
