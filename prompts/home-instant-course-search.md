# Home page: instant course search in place

## Goal
Typing in the home hero search box filters the "All Courses" grid on the same page as you type. There is no navigation and no redirect. Pressing Enter scrolls the courses section into view.

## Skills and docs read
- AGENTS.md §5: pages read stored data, and the browser holds no token. Here the course list is fetched server-side and only public card fields go to the client.
- sanity-best-practices (GROQ projection, TypeGen).
- Next.js docs on server and client component boundaries (passing server children through a client provider).

## Code inspected
- `app/page.tsx`: the hero has `SearchInput` (`#home-search`) with no behavior. `CourseGrid` is a server component showing the first 6 of `getCourses()`.
- `components/ui/input.tsx` (`SearchInput`), `components/search-shortcut.tsx` (⌘K focus), `components/ui/card.tsx` (`CourseCard`), `components/spotlight-card.tsx` (client).
- `sanity/lib/queries.ts` `COURSES_QUERY`, `sanity.types.ts`, studio `typegen` script.

## Decisions
- **Scope.** This is an instant client-side filter of courses already loaded on the page. It is not the AI search from AGENTS §11 (MCP plus LLM, full results page with video and lesson results), which is still unbuilt and separate.
- **Shared state.** A small client `CourseSearchProvider` (React context) wraps the home `<main>`. The hero input and the course grid are both client leaves that read and write the query. Server content such as TechText and DotGrid passes through as children.
- **Data.**
  - `CourseGrid` (server) fetches all courses once.
  - It maps them to plain card props: slug, title, summary, level and duration labels, module count, cover image URL, category title, and lesson titles.
  - It passes these to a client `CourseResults`. The browser gets no token or raw Sanity documents.
- **Query change.** Add `"lessonTitles": modules[].lessons[]->title` to `COURSES_QUERY`, so a search like "hooks" finds the course teaching it, then regenerate types.
- **Matching.**
  - Case-insensitive and token-based. Every word must appear in the title, summary, category, level, or a lesson title.
  - Results are ranked by where the match is: title, then category, then summary, then lesson titles.
- **Display.**
  - Empty query: the first 6 courses, exactly as today.
  - With a query: all matching courses, and the heading row shows `N results for "query"` with a "Clear" text button.
  - No matches: an empty state ("No courses match …") with a Clear button.
  - Cards render exactly as now (SpotlightCard plus CourseCard stacked).
- Enter in the search box is handled locally (`preventDefault`) and smooth-scrolls to `#courses`. The ⌘K shortcut is unchanged.
- Card links still go to `/courses/<slug>`. Signed-out users get the existing sign-in prompt.

## Files
- `components/course-search.tsx` (new, client): provider, `HomeSearchInput`, `CourseResults`.
- `app/page.tsx`: wire them in.
- `sanity/lib/queries.ts`, `sanity.types.ts` (regenerated).

## Security
- Only public card fields are serialized to the client. No tokens, and no new routes.

## Acceptance
- Typing filters the grid on every keystroke with no URL change or navigation.
- Clearing the box restores the original 6 cards.
- The count and empty state appear as described.

## Checks
- `npm run typegen` in studio, then `npx tsc --noEmit`, `npm run lint`, and `npm run build` in web.

## Manual test
1. `npm run dev`, open `/`.
2. Type a word from a course title, such as "docker". The grid narrows instantly and shows the result count.
3. Type a lesson topic. The course containing that lesson appears.
4. Type nonsense. The empty state shows. Click Clear and the 6 default cards return.
5. Press Enter. The page scrolls to the courses section and the URL is unchanged.
