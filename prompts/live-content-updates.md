# Live content updates (no reload when content changes)

## Goal

When content changes on the server (an editor publishes in Sanity Studio, or an import or migration writes to the dataset), every open page of the site shows the change within a second or two, without a reload.

## What the user asked, and how it maps

- The user asked for "optimistic UI" and described it as: *"When anything happens on the server side, it will be implemented right away without needing to reload the page. It gets edited instantly."* That is **live server-to-client updates**, which Sanity provides as the **Live Content API**, wired in Next.js with `defineLive` and `<SanityLive />`.
- **Optimistic UI** in the strict sense means updating the screen *before* the server confirms the user's own action. The app has no user writes yet: Bookmark is presentational and progress tracking isn't built. When those exist, they'll use React's `useOptimistic` with server actions. That's out of scope here and noted for the progress feature.

## Skills and docs read

- AGENTS.md: §5 (browser holds no token; pages read-only; server-only data access), §12 (private dataset, token server-only)
- sanity-best-practices `nextjs.md`, §2 Live Content API and §3 caching
- `next-sanity` 13.4.0 type docs in `dist/live/conditions/next-js/index.d.ts`, `dist/types.d.ts`, `dist/live/cache-life.d.ts`. `defineLive` supports Cache Components: `sanityFetch` calls `cacheTag`/`cacheLife` internally, the app provides one `'use cache'` boundary, and `cacheLife: { default: sanity }` comes from `next-sanity/live/cache-life`.
  - `browserToken` is only shared when `<SanityLive includeDrafts />` opens a draft-capable connection.

## Verified before planning

- The live event stream on this **private** dataset answers **without a token**: `GET https://s4t04ft4.api.sanity.io/v2025-02-19/data/live/events/production` → `200 text/event-stream`, `event: welcome`. With the server token it behaves the same.
- Events carry sync tags only, never document content. So the browser can listen with no token, and the server refetches with its token. **AGENTS.md's no-token-in-browser rule holds.**

## Code inspected

- `sanity/lib/client.ts`: server-only, token, `useCdn: false`, `perspective: 'published'`.
- `sanity/lib/fetch.ts`: `sanityFetch({query, params, tags})` with `'use cache'`, `cacheLife('minutes')`, and `cacheTag(...tags)`. Today, edits appear only after the `minutes` profile expires and a request revalidates.
- `sanity/data.ts`: `getCourses`, `getCourse`, `getLesson`, `getInstructor`, `getCategories`, and slug helpers, all calling `sanityFetch` with type tags.
- `app/layout.tsx`: root layout. There's no `<SanityLive />`.
- `next.config.ts`: `cacheComponents: true` and no `cacheLife` config.

## Decisions

- **`sanity/lib/live.ts`** (new, `server-only`):
  - `defineLive({ client, serverToken: token, strict: true })`, with **no `browserToken`**. The site only shows published content, and there's no draft mode or visual editing.
  - Export `SanityLive`, plus one shared cache boundary: `cachedSanityFetch = async (options) => { 'use cache'; return sanityFetch(options) }`, the pattern the next-sanity docs give.
- **`sanity/lib/fetch.ts`**: the app's `sanityFetch({ query, params })` calls `cachedSanityFetch({ query, params, perspective: 'published', stega: false })` and returns `data`. Remove the manual `cacheLife('minutes')` and type `tags`. `defineLive` tags each result with Sanity's sync tags, so only queries whose content actually changed are invalidated. The return type stays `ClientReturn<Query>`, so callers keep their TypeGen types.
- **`sanity/data.ts`**: drop the now-unused `tags` arguments. Function names and return types don't change, so pages need no changes.
- **`next.config.ts`**: `cacheLife: { default: sanity }` from `next-sanity/live/cache-life`. Cached Sanity results live until a live event invalidates them, instead of expiring on a timer.
- **`app/layout.tsx`**: render `<SanityLive includeDrafts={false} />` once, inside `<body>`. It opens the tokenless event stream and, when an event's tags match content on the page, triggers a server refresh. The page re-renders in place, keeping scroll position and client state such as open module accordions.
- No new packages: `next-sanity` already ships `defineLive`.

## Files expected to touch

- New: `sanity/lib/live.ts`
- Edit: `sanity/lib/fetch.ts`, `sanity/data.ts`, `app/layout.tsx`, `next.config.ts`
- No schema, query, or page changes.

## Security considerations

- **No token reaches the browser.** `browserToken` is not set, and `live.ts`, `client.ts`, and `token.ts` stay `server-only`. Checks: grep the client bundle for the token's prefix (expect 0 matches) and confirm the browser's live request has no `Authorization` header.
- The live stream exposes only opaque sync tags, never content. The dataset stays private.
- No write paths are added. The browser still never writes content.

## Acceptance criteria

- With the site open and no reload, publishing an edit in Studio, such as a course title or summary, shows the new text on the home grid and the course page within a few seconds.
- Unrelated pages aren't refetched (fine-grained sync tags).
- The browser network tab shows one EventSource to `…/data/live/events/production` with no Authorization header. No token appears in client JavaScript.
- Type check, lint, and build pass, and all 10 course pages are still prerendered.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Token-leak check: search `.next/static` for the token's first 8 characters (expect 0) without printing the token.
- **End-to-end live test** (needs your approval because it touches real content):
  1. Open `/courses/nextjs-app-router-in-depth` in headless Chrome and note the title.
  2. With the user's logged-in Sanity CLI session, patch that course's `title` to append ` (live test)`.
  3. Without reloading, wait for the page title in the DOM to change, and record how long it took.
  4. Patch the title back to the original value and confirm the page reverts live too. The original value is read first and restored exactly.

## Manual test steps

1. Run `npm run dev`, then open http://localhost:3000/courses/nextjs-app-router-in-depth in one window.
2. In another window, open the Studio (http://localhost:3333) and edit that course's summary, then publish.
3. Without touching the site window, the summary updates within a few seconds.
4. Change it back and publish. It updates again.

## Execution notes

- Type check, lint, and build pass. All 10 course pages are still prerendered, and the routes now show `Revalidate 1y`: cached until a live event invalidates them.
- Token-leak scan: 0 of 23 client bundle files and 0 prerendered HTML/RSC files contain the token's prefix.
- E2E live test (approved), on `course.nextjs-app-router-in-depth`, with the page open in headless Chrome:
  - Title patched to "… (live test)": the open page showed it **1.8 s** after the patch returned.
  - Title restored: the page showed it **1.6 s** later. The page was never reloaded (window marker intact, no navigations).
  - One live EventSource, `…/v2026-10-31/data/live/events/production`, with **no Authorization header**.
  - Title confirmed restored exactly. The temporary `studio/.live-test.ts` was deleted.
- Found but not touched: an unpublished draft, `drafts.course.building-ai-apps-with-llms`, updated 16:50:52Z, before the test. Drafts aren't shown on the site (published perspective), so it appears live only once it's published.
