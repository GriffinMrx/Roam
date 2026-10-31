# Learner progress: real progress bars, Start/Continue Learning, completion checks

## Goal (from the user)

1. Make the progress bars real: show each learner's actual progress as they watch any lesson video.
2. Make **Continue Learning** work. Before any progress it starts the course. After the learner has progressed, coming back to the course shows **Continue Learning** and resumes where they left off.
3. **Completion checks:** when a lesson's video is watched, that lesson shows a check. When every lesson in a module is done, the module's number circle turns into a check. This applies on the course page's Course Content list and the lesson page's sidebar.

## Skills and docs read

- AGENTS.md:
  - §5 (any write goes through a server route; the browser never writes progress; auth in middleware)
  - §7 (progress per learner, keyed by Clerk user id; completion marks and a resume affordance; the server route uses a write token; kept apart from read-only content)
  - §8 (progress record), §12 (write token server-only; Clerk secret server-only)
- Clerk Next.js patterns: `await auth()`, `clerkMiddleware` and `createRouteMatcher`, and reads inside `<Suspense>` with Cache Components
- sanity-best-practices `schema.md` (references, explicit IDs only when justified)
- Next.js 16 caching guide (per-user data is not put in a shared `'use cache'`, and it's read inside `<Suspense>`)

## Code inspected

- `proxy.ts`: `clerkMiddleware()` with no protected routes. `app/api/` doesn't exist yet.
- Course page: hero **Continue Learning** links to the first lesson, a "Your Progress" bar is hard-coded to 0%, and `CourseModules` (client) shows numbered circles.
- Lesson page: `LessonSidebar` (client) shows numbered circles and lesson dots, with the course card at "0% complete". `VideoPlayer` (client, YouTube IFrame API) tracks `current`, `duration`, and `playing`.
- `sanity/lib/client.ts` is a server-only read client (token, published). There's no write token in `.env.local`: only `SANITY_API_READ_TOKEN`.
- Zod 4.6.7 is present only as a transitive dependency.

## Data model: the `progress` document (app state, apart from content)

- One document **per learner per course**, with a deterministic ID: `progress.<clerkUserId>.<courseId without the "course." prefix>`.
  - The deterministic ID is a deliberate exception to "prefer generated IDs". It makes each write an atomic `createIfNotExists` + `patch` on a known ID, so two tabs can never create duplicate records for the same learner and course. Clerk IDs (`user_…`) only contain characters Sanity allows in IDs.
- Fields:
  - `userId` (string, the Clerk user ID)
  - `course` (weak reference)
  - `lessons[]`: `{ _key: <lessonId>, lesson: weak ref, position (s), duration (s), completed (bool), completedAt, updatedAt }`
  - `lastLesson` (weak ref), `lastPosition` (s), `updatedAt`
- Weak references, so progress never blocks deleting or editing content.
- Schema type `progress` is added to the Studio as **read-only**, not listed in the desk structure, and excluded later from the search Context scope. It's app state, not authored content.
- **Completed** means the learner reached ≥ 90% of the video, or the player reported "ended". Once completed, a lesson stays completed, even if it's rewatched from the start.
- **Module complete** means every lesson in it is completed. **Course %** = completed lessons ÷ total lessons, rounded.

## Writes: `POST /api/progress` (server route, the only write path)

- `app/api/progress/route.ts`:
  - `const { userId } = await auth()`. Without a user it returns **401**.
  - Body validated with **Zod**: `{ lessonId: /^lesson\.[a-z0-9-]+$/, position: 0–86 400, duration: 1–86 400, ended?: boolean }`. Anything else returns 400.
  - **The server derives the course** from the lesson by reverse reference, with the read client. A missing lesson or course returns 404. Client-sent course IDs are never trusted.
  - **CSRF:** the `Origin` header must match the request host (403 otherwise). JSON content type only.
  - Write: one transaction, with `createIfNotExists` (ID, `userId`, `course`), then a patch:
    - `setIfMissing({ lessons: [] })`
    - `unset(lessons[_key=="<id>"])` and `insert(after, lessons[-1], <entry>)`
    - `set` `lastLesson`, `lastPosition`, and `updatedAt`
    - `completed` stays true if it was already true (read before writing)
  - Uses a new **server-only write client** (`sanity/lib/write-client.ts`, `import "server-only"`) with `SANITY_API_WRITE_TOKEN`.
- `proxy.ts`: `createRouteMatcher(["/api/progress(.*)"])` and `await auth.protect()`, so the route is protected in middleware (AGENTS §12). The handler checks again as defence in depth.
- **New credential:** a Sanity API token named "Roam web progress" with the **Editor** role, created with the CLI and written straight into `.env.local` as `SANITY_API_WRITE_TOKEN` without printing it. Its name, without a value, is added to `.env.example`. Sanity tokens are per-role, not per-type, so this token can write any document. It only ever runs on the server inside this one route.

## Reads (per learner: never shared-cached)

- `sanity/progress.ts` (`server-only`): `getCourseProgress(courseId)` reads the current user's progress document. It's wrapped in React `cache()`, so it's deduplicated within one request.
  - It uses `await auth()`, has no `'use cache'`, and is always read inside `<Suspense>`. Shared content stays prerendered and cached; only the progress parts stream per request.
  - Signed-out learners get `null`.
- Derived helpers (pure, `lib/progress.ts`): completed lesson IDs, completed module keys, course %, and the **resume target**:
  - the last-watched lesson at its saved position, if it's not completed
  - otherwise the first incomplete lesson in course order, from 0
  - otherwise (all done) the first lesson

## UI changes

- **Course page:**
  - Hero button:
    - "Start Learning" (no progress) → first lesson
    - "Continue Learning" (some progress) → resume target, `/lessons/<slug>?t=<position>`
    - "Review Course" (all complete) → first lesson
  - The same label and link appear on the bottom "Your Progress" bar, which shows the real % and bar.
  - Course Content: a completed lesson row shows `check-circle` in place of the play icon. A completed module's number circle becomes a filled purple circle with a check.
  - Signed out: "Start Learning", and the progress bar shows "Sign in to track your progress" with a Clerk sign-in button.
- **Lesson page:**
  - Sidebar course card shows the real %.
  - Completed modules show a check in the number circle. Completed lessons show a check in place of the hollow dot.
  - The current lesson keeps "Now playing".
- **Player:**
  - When there's no `?t=` in the URL, it resumes from the saved position. An explicit `?t=` always wins. A completed or near-end lesson restarts from 0.
  - While playing, it reports progress every **10 s**. It also reports on pause, on end, and on tab hide (`fetch(..., { keepalive: true })`).
- **Optimistic UI** (the user's earlier request): a client `LessonProgressProvider` holds the learner's progress for the course. The player updates it immediately: the sidebar check and % change the moment a lesson completes, before the server confirms. Then it POSTs. A failed POST keeps the local state and retries with the next report. Progress writes are idempotent.

## Files expected to touch

- New:
  - `app/api/progress/route.ts`
  - `sanity/lib/write-client.ts`, `sanity/progress.ts`
  - `lib/progress.ts`
  - `components/lesson-progress.tsx` (provider and hooks)
  - `studio/schemaTypes/documents/progress.ts`
- Edit:
  - `proxy.ts`
  - `app/courses/[slug]/page.tsx`, `components/course-modules.tsx`
  - `app/lessons/[slug]/page.tsx`, `components/lesson-sidebar.tsx`, `components/video-player.tsx`
  - `studio/schemaTypes/index.ts`
  - `sanity.types.ts` (generated)
  - `.env.example`, `package.json` (add `zod`)

## Security considerations

- The browser never writes to Sanity. The only write path is `POST /api/progress`, protected in `proxy.ts` and checked again with `auth()`.
- The user ID comes only from the Clerk session, never from the request body.
- Input is validated with Zod and bounded. The course comes from the lesson on the server. There's an Origin check for CSRF.
- The write and read tokens are `server-only`. Checks: grep the client bundles and the prerendered output for both token prefixes (expect 0).
- A learner can only ever read or write their own `progress.<theirUserId>.*` documents, because the ID is built from the session user ID.
- Not included: rate limiting. Note: with a 10 s cadence, one viewer means about 6 writes per minute.

## Acceptance criteria

- Signed in, watching a lesson:
  - The sidebar % rises when a lesson completes, and the lesson and module checks appear without a reload.
  - A progress document appears for that user and course.
- Leaving and returning to the course page shows "Continue Learning". Clicking it opens the last lesson at the saved second.
- A fully watched module shows a check in its circle, on both the course page and the sidebar.
- Signed out: no writes, "Start Learning", and the sign-in prompt on the progress bar. `POST /api/progress` without a session returns 401.
- Type check, lint, and build pass, and no token appears in client output.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`. Studio: tsc, schema deploy, typegen.
- `curl -X POST /api/progress` signed out → 401. A bad body or bad Origin (with a session) → 400 or 403.
- Token-leak scan of `.next/static` and the prerendered output.
- **E2E (needs your approval):**
  1. Create a Clerk **test user** (`roam-e2e+clerk_test@example.com`, random password, dev verification code 424242) with the Clerk CLI.
  2. Sign in with headless Chrome, open a lesson, seek near the end and play to completion, and check that the sidebar check and % update live.
  3. Go back to the course page and check for "Continue Learning" and the module and lesson checks.
  4. Afterwards, delete the test user and their `progress.*` documents.

## Manual test steps

1. Sign in.
2. Open a course. The button says **Start Learning**. Click it.
3. Watch a lesson to the end, or drag near the end and let it finish. Its sidebar dot becomes a check and the % goes up, without a reload.
4. Go back to the course page. The button says **Continue Learning**, the progress bar shows your %, and the lesson has a check.
5. Finish every lesson in Module 1. Its number circle turns into a check.
6. Click **Continue Learning**. It opens where you left off.

## Execution notes

- `proxy.ts`: `auth.protect()` redirected unauthenticated API calls to `/sign-in` with a 307, because Clerk treats requests without browser fetch metadata as page navigations. The proxy now returns **401 JSON** for `/api/progress` when there's no session, so protection still happens in middleware with an API-appropriate response. The route handler checks `auth()` again.
- Token-leak scan after the build: 0 hits for either token in 25 client bundle files and 769 prerendered files.

## Change during implementation: progress reads go through the route, not page rendering

- **Problem found:** calling Clerk `auth()` while rendering the course and lesson pages failed for every visitor, in dev and in the production build. The error was *"auth() was called but Clerk can't detect usage of clerkMiddleware()"* (React #441 in production), tagged *Prefetch*.
  - These routes are prerendered per slug with Cache Components and Partial Prefetching. The render that resolves their Suspense content doesn't carry the request headers `clerkMiddleware` adds.
  - Deferring with `navigation()` didn't help. The header's Clerk controls and the home page were unaffected.
- **Fix (architecture):**
  - Pages stay fully static and cached, and **never call `auth()`**.
  - Progress is read through **`GET /api/progress?courseId=…`**, a route handler protected in `proxy.ts` that calls `auth()` and returns the session user's progress with `cache-control: private, no-store`. Writes stay on `POST /api/progress`.
  - A client **`CourseProgressProvider`** (`components/course-progress.tsx`) waits for Clerk's `useAuth()`, fetches progress once, merges in anything reported optimistically in the meantime, and exposes the done lessons and modules, the %, and the resume target.
  - It's used on both the course page (`LearnButton`, `ProgressSummary`, and `CourseModules` read it) and the lesson page (sidebar and player).
  - The browser still never talks to Sanity and holds no token.
- **Resume:** the server can't know the saved position at render time, so the player resumes on the learner's **first play**: it `seekTo`s the saved second when there's no `?t=`. Continue Learning links still carry `?t=<seconds>`.
- **Trade-off:** the button label and checks appear a moment after the page loads. Before that they show the signed-out default ("Start Learning", no checks).
- Removed: the server-side `getCourseProgress` (with `navigation()`) and `components/lesson-progress.tsx`. Added: `components/course-progress-ui.tsx` and `readCourseProgress(userId, courseId)` in `sanity/progress.ts` (called only by the route).

## Correction: the real root cause

- The Clerk "can't detect clerkMiddleware()" error wasn't a Cache Components or prefetch limitation. **It was a regression I introduced** when rewriting `proxy.ts` through the shell: the matcher's `\.` became `\.`. In a JS string, `"\."` is just `"."`, so the pattern meant "any character + `js`/`css`/`png`…". That excluded every URL containing those letters, such as `/courses/nextjs-app-router-in-depth` and its lessons, from `clerkMiddleware`.
- It was proven by response headers: before the fix, `/courses/nextjs-…` had 0 `x-clerk-auth-*` headers while `/courses/python-for-data-work` had 2. After restoring Clerk's original `\.`, every page URL has them and static files (`.js`, `.png`) still have 0.
- It also broke the header's `<Show>` (server `auth()`) on those pages for signed-in users.
- The API-route design above is **kept**: it keeps every course and lesson page fully static and cached, and confines per-learner reads to one protected route.
- Lesson: shell rewrites of files with escaped strings are now done with the editor tool, not heredocs.

## Verification results

- E2E (Clerk test user, headless Chrome, signed in through the real Clerk form with dev code 424242), on the Next.js App Router course:
  - Lesson 1.1 watched past 90%: the sidebar went 0% → **8%** live, showing "Now playing · Completed", with no reload.
  - Lesson 1.2: → **17%**, and lesson 1.1 shows a check.
  - Lesson 1.3: → **25%**, and **"Module 1 complete"** appeared live.
  - Lesson 2.1 partly watched and paused at about 1:43: not completed, % unchanged.
  - Course page afterwards: **Continue Learning → `/lessons/nextjs-app-router-in-depth-server-components?t=103`**, "25% complete", a progress bar at 25, the Module 1 check, and 3 lesson checks.
  - All 9 `POST /api/progress` calls returned 200. The stored document held 4 lesson entries.
- Signed out: `GET` and `POST /api/progress` return **401** from the proxy, and the course page shows "Start Learning" and "Sign in to track your progress".
- The finished-lesson checks in the sidebar were enlarged to 18px after the screenshot review, because at 14px they read like hollow dots.
- Build: 140 pages prerendered. Token scan: 0 read-token and 0 write-token hits in 25 client bundles and 769 prerendered files.
- Cleanup: the test user's progress document was deleted (0 progress documents remain in the dataset), and the Clerk test user was deleted (lookup now returns 404). The local credentials file was removed.
