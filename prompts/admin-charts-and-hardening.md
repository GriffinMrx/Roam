# Remove chat, then admin charts, performance pass, and security/bug sweep

## Goal

0. **First: remove the chat feature completely.** The user asked for this on approval: "as the first one also remove the chat feature and everything related to it completely".
1. Show the admin **Overview** (`/admin`) and **Insights** (`/admin/insights`) stats as real charts instead of number tiles and progress-bar lists.
2. Make the app faster where it measurably matters.
3. Sweep for bugs and security leaks and fix what is found.

Stay inside the admin console's existing flat style (`rounded-sm bg-neutral-50` cards, Settings-like sidebar).

## Step 0: Remove chat (done first)

What gets deleted, from an inventory of every chat reference in the repo.

- **UI:**
  - All of `components/chat/`: panel, provider, inbox, conversation, composer, message, lesson card, lesson share, share sheet, the members and new-chat modals, and the messages button.
  - The UI pieces only chat used: `components/ui/{vanish-input,animated-tabs,animated-tooltip,animated-modal,animated-list,rolling-counter}.tsx`. Nothing else imports them.
- **Server:**
  - `lib/chat/` (store, live, lesson, route, shared, admin) and `lib/realtime.ts`.
  - `app/api/chat/**`, `app/api/admin/chat/[id]`, `app/admin/chat/` and `components/admin/chat-report-actions.tsx`.
- **Wiring:**
  - `app/layout.tsx`: drop `<ChatProvider>`.
  - `components/site-header.tsx`: drop `<MessagesButton/>`.
  - `app/lessons/[slug]/page.tsx`: drop the Share button and `ChatLessonContext`; Bookmark stays.
  - `components/comments/discussion.tsx`: drop "Message {name}" and `useChat`.
  - `components/video-player.tsx`: drop `CURRENT_TIME_EVENT`, which only chat used.
  - `components/admin/admin-shell.tsx`: drop the Chat tab.
  - `proxy.ts`: drop the `/api/chat(.*)` matcher.
  - `lib/admin.ts`: drop `"chat"` from `AuditTarget`.
- **Kept on purpose:**
  - The `chat` icon glyph, because the Settings "Comments" tab uses it.
  - The audit labels for old `chat.*` actions. The audit log is append-only history, so past entries keep reading in plain English.
  - `motion`, because the home page's hover-border gradient uses it.
- **Packages:** uninstall `@neon/realtime`, `@neon/realtime-react` and `frimousse`.
- **Database:**
  - A new Drizzle migration drops `chat_reactions`, `chat_reports`, `chat_blocks`, `chat_messages`, `chat_members` and `chat_conversations`, and the tables are removed from `lib/db/schema.ts`.
  - **This permanently deletes every chat message, conversation, block and report.**
- **Env:**
  - Remove `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET` and `NEXT_PUBLIC_NEON_REALTIME_URL` from `.env.example` and `.env.local`.
  - Turn off Neon Realtime on the branch with the `neon` CLI if it's installed and signed in. If not, list it under "Needs your attention".
- **Check:** after removal, a case-insensitive grep for "chat" and "realtime" finds only the kept items above, and the build passes.

## Skills and docs read

- `dataviz` skill (procedure, choosing-a-form, palette, validator). Chart colors were run through `scripts/validate_palette.js` for both themes.
- AGENTS.md (server/client boundaries, private tokens, checks).
- `node_modules/next/dist/docs/` for cacheComponents / Suspense rules (already in use on these pages).

## Code inspected

- **Pages:** `app/admin/page.tsx` (Overview: `Stat` tiles, newest accounts, recent audit) and `app/admin/insights/page.tsx` (`BarList` progress bars, "Answers per week" as a text list).
- **Data:**
  - `lib/admin-data.ts`, where `overviewStats()` makes 5 Clerk calls and about 8 Neon counts.
  - `lib/user-profile.ts`, with `surveyInsights()` and its weekly `date_trunc`.
- **Schema:** `lib/db/schema.ts`. Timestamps exist on `comments`, `teacher_progress.completed_at`, `user_profiles`, `teacher_courses` and `admin_audit`.
- **Editorial progress:** `app/api/progress/route.ts` keeps it in Sanity `progress` docs, with `lessons[].completedAt`.
- **Security surface:**
  - `proxy.ts` (page and API matchers).
  - `lib/comments-route.ts` `guardWrite` (session, same-origin, JSON, strict Zod), plus `lib/admin.ts` guards.
  - Every `app/api/**/route.ts`. Each one either calls `auth()` or goes through `guardWrite`/admin guards; the only public routes are `/api/health/db` and comments `GET`.
- **Headers:** `next.config.ts`. Security headers are set for `/admin` and `/api/admin` only.
- **Rate limits:** in-memory `Map`s in `lib/admin.ts` (`writes`) and `lib/teach/route.ts`.

## Findings (already confirmed by reading the code)

1. **Bug, Overview "Lessons completed".** It counts only `teacher_progress` (teacher-made lessons). Every completion of an editorial (Sanity) lesson is missing, so the number is far too low.
2. **Security, rate limits live in server memory.**
   - They don't hold across server instances or restarts, which is the normal state on Vercel.
   - Clearing the map once it passes a size wipes everyone's limits at once.
   - So the admin and teacher write limits can be bypassed by landing on another instance.
3. **Security, no site-wide security headers.**
   - Every page except `/admin` can be framed by another site (clickjacking on Settings, onboarding and lessons).
   - Responses go out without `X-Content-Type-Options: nosniff`, with Next's default referrer behavior, and with the `X-Powered-By` header.

More findings may come out of the sweep in step E. Each one gets fixed only if it's a real defect, and the report will list it.

## Decisions

### A. Charts (zero new dependencies)

- **Rendering:**
  - Hand-built SVG chart components in `components/admin/charts/`.
  - Geometry is computed on the server, so the page stays a server component with no chart library in the bundle.
  - A tiny client wrapper adds the hover layer: a crosshair and tooltip on line/area charts, and a per-bar tooltip on bars.
  - Hover is keyboard-reachable, and each chart has a visually hidden data table for screen readers.
- **Palette:** it uses the app's own tokens.
  - Every chart is a single series, so one hue: `--color-primary-500` in dark and primary-600 (`#9333ea`) in light, for contrast on white.
  - If a second series is ever needed, the validated second hue is aqua: `#1baf7a` in dark, `#12946a` in light. Both pass all checks.
- **Marks:** thin bars with 4px rounded data ends, 2px lines, a recessive grid, and one y-axis only. Text stays in the text tokens and never in the series color.
- **Range control:** the Overview gets a `7d / 30d / 90d` control (default 30d) in one row above the charts, driven by a `?range=` search param. It's validated server-side, and unknown values fall back to 30d.

### B. Overview (`/admin`): what each stat becomes

| Today | Becomes |
|---|---|
| Users / New this week / Active this week / Teachers / Open reports / Waiting for review | **KPI row of stat tiles**: value, change vs the previous period, and a sparkline where a daily series exists (sign-ups, comments, lesson completions) |
| (none) | **Sign-ups per day**: column chart, from Clerk `createdAt`, paged and capped at 2,000 users per range |
| Lessons completed (wrong number) | **Lessons completed per day**: area chart combining Sanity `lessons[].completedAt` and `teacher_progress.completed_at`. Fixes finding 1 |
| Comments this week | **Comments per day**: line chart |
| Course status hint text | **Teacher courses by status**: tall segmented bar (draft / pending / published / rejected) with a legend of names and counts printed on the segments |
| Newest accounts, Recent admin actions | Unchanged lists |

### C. Insights (`/admin/insights`)

- **Category questions** (who they are, how they heard, goals, topics) become **ranked horizontal bars**: one hue, largest first, with count and % labels, and a tooltip.
- **Scale questions** (experience level, time per week) use the same bars, but **in scale order** rather than ranked.
- **Learn or teach** (2 parts) becomes a **tall segmented bar**.
- **Answers per week** becomes a **column chart**.
- "Other" sources stay as a text list.
- The CSV download is unchanged.

### D. Performance pass

- Add a Drizzle migration for indexes: `teacher_progress (completed, completed_at)` and `user_profiles (created_at)`.
- Every time-series query is one grouped `date_trunc('day', …)` SQL statement, so no rows are pulled into JS. Missing days are filled with zero on the server.
- **Overview data loading:**
  - Neon, Clerk and Sanity are queried in parallel (`Promise.all`).
  - Each section streams in its own Suspense boundary with a matching skeleton, so a slow Clerk call doesn't block the charts.
- **App-wide:**
  - Removing chat already takes realtime, the emoji picker and the chat panel out of every page.
  - Run `next build` and note each route's client JS from the build output.
  - Lazy-load any large client-only module that's on a page's first load but not needed for first paint, if the build output shows one.
  - Report before/after numbers. Nothing is changed blindly.
- Set `poweredByHeader: false`.

### E. Security fixes

- **Rate limits move to Postgres.** They'll hold across instances and can't be wiped.
  - **Admin write limit:** count the actor's `admin_audit` rows in the last minute.
  - **Teacher writes:** a small `rate_events` table, `(user_id, bucket, created_at)`, with old rows pruned on write.
  - Remove the in-memory maps.
- **Site-wide headers** (`next.config.ts`, `source: "/:path*"`):
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN` plus CSP `frame-ancestors 'self'`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - The stricter admin headers stay as they are.
  - The video embeds are iframes *inside* our pages, so `frame-ancestors` doesn't affect them.
- **Sweep checklist, run during the build:**
  - Every route handler: auth before any read, ownership checks on ids from the URL, strict Zod, and no internal error text in responses.
  - Server-only modules import `server-only`.
  - No secret env var is read in a client file, and nothing outside `NEXT_PUBLIC_*` reaches the bundle (grep the built client chunks for secret names).
  - No `dangerouslySetInnerHTML` with user data.
  - Fix any real defect found and list it in the report.

## Files expected to change

- **Delete or edit for step 0:** the files listed there, plus `package.json`, `.env.example`, `.env.local`, and a new drop-tables migration.
- **New:** `components/admin/charts/{bar-chart,column-chart,line-chart,area-chart,segmented-bar,sparkline,stat-tile,chart-tooltip,range-control}.tsx` (only the ones actually needed), `lib/admin-series.ts` (time-series queries), `lib/rate-limit.ts`, and an index plus `rate_events` migration.
- **Edit:** `app/admin/page.tsx`, `app/admin/insights/page.tsx`, `lib/admin-data.ts`, `lib/admin.ts`, `lib/teach/route.ts`, `lib/db/schema.ts`, `next.config.ts`, and `sanity/` (one GROQ query for completions by day, then regenerate types).

## Security considerations

- The charts read server-side only, inside `requireAdminPage`, so non-admins still get a 404.
- Aggregates only: no names, emails or ids in chart data or tooltips.
- Range input is allow-listed.
- Rate limits use the Clerk user id from the session, never from the request body.
- The chat removal also removes the Realtime secret from the app and the live-query surface.

## Acceptance criteria

- **Chat is gone:** no Messages button, no Share button on lessons, no Admin Chat tab, `/api/chat/*` returns 404, no chat tables, and no realtime or emoji packages.
- **Overview:** shows the KPI tiles with sparklines and changes, sign-ups, lessons completed (editorial plus teacher), comments per day and course status. Switching 7d/30d/90d updates every chart.
- **Insights:** every question is a chart in the right form. Scale questions are in scale order. Answers per week is a column chart.
- **Interaction:** hovering any bar or point shows a tooltip with the exact value and date. Charts read well in dark and light themes and stack on mobile.
- **Lessons completed:** includes editorial lesson completions.
- **Rate limits:** the admin and teacher write limits come from the database and still apply after a dev server restart.
- **Headers:** the home page response carries the new security headers, and lesson videos still play.
- **Checks:** type check, lint and build pass, and the report lists any sweep findings.

## Checks to run

- `npx tsc --noEmit`, `npx eslint`, `npx next build`.
- `npx drizzle-kit migrate` for the drop-chat, index and `rate_events` migrations.
- Studio typegen for the new GROQ query.
- Headless-browser screenshots of `/admin` and `/admin/insights` in both themes, using a temporary admin session. The temp account is deleted afterwards.
- `curl -I` the home page for headers.
- A scripted test that the teacher write limit still applies after a dev server restart.

## Manual test steps

1. The header has no Messages button, and a lesson page has no Share button. `/admin` has no Chat tab.
2. Open `/admin`. You see the KPI tiles with sparklines, then the sign-ups, lessons completed, comments per day and course status charts.
3. Click 7d, 30d and 90d. The charts and the changes update.
4. Hover bars and lines. A tooltip shows the date and value.
5. Open `/admin/insights`. Each question is a chart. Experience level and weekly time read in scale order.
6. Switch Settings → Appearance to Light and recheck both pages.
7. Complete a lesson on any course. "Lessons completed" today goes up by 1.
8. Open a lesson. The video still plays (headers didn't block the embed).
