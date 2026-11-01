# Lesson comments ("Discussion") on Neon Postgres

## Goal
A discussion section on every lesson, stored in Neon Postgres (not Sanity: comments are high-write user data).
- **Where:** a third lesson tab, **"Discussion (N)"**, next to Lesson Content and Notes.
- **Post:** signed-in learners write plain-text comments (up to 2,000 characters).
- **Replies:** one level of replies, so threads stay readable.
- **Timestamp chips:** typing "3:12" in a comment becomes a chip that **seeks the lesson video** to that second without reloading. Roam-specific.
- **Likes:** like or unlike, with Top / Newest sort.
- **Edit and delete your own:** an edit shows "edited". A delete shows "Comment deleted" but keeps its replies.
- **Report:** a "Report" button (once per user per comment).
- **Moderation:** admins (Clerk `publicMetadata.role = "admin"`, set in the Clerk dashboard) can hide or unhide comments. Hidden comments disappear for everyone else and are kept in the database, not destroyed. Admins see a "Hidden" label and the report count.
- **Instructor badge** on comments by users with Clerk `publicMetadata.role = "instructor"`.
- **Signed out** (free-preview lessons): read-only, with "Sign in to join the discussion".

Assumptions I'm taking, since these were open questions:
- every signed-in learner can post (no enrollment check)
- "admin hides + users report" is enough moderation for now
- design follows the existing style (raised graphite panels, glossy gray pills, duotone icons)

## Skills and docs read
- Neon skills (`neon`, `neon-postgres`; installed via the Claude Code plugin):
  - schema and migrations as code: Drizzle is suggested when there's no existing ORM; use only Drizzle for schema and migrations
  - **migrations over the direct `DATABASE_URL_UNPOOLED`**, app traffic over the pooled `DATABASE_URL`
  - **test a migration on a branch of production before applying it to production**
  - `node-postgres` with `attachDatabasePool` on Vercel (already in `lib/db.ts`)
- AGENTS.md:
  - §5: writes only through server routes; nothing secret in the browser
  - §7: per-user state keyed by Clerk id and kept apart from content
  - §12: auth in the proxy and the server
- Next 16 route handlers; Clerk backend `getUser` (publicMetadata for roles).

## Code inspected
- `lib/db.ts`: a pooled `pg` Pool (server-only).
- `app/api/health/db`: proves connectivity.
- `components/lesson-tabs.tsx`: Lesson Content and Notes, both server-rendered and passed in.
- `app/lessons/[slug]/page.tsx`: the lesson id, free-preview flag, and the player in `LessonVideo`.
- `components/video-player.tsx`: `YouTubePlayer` has `seek(to)`. Vimeo and Bunny embeds use the provider's controls.
- `proxy.ts`:
  - lessons are gated except free preview
  - API 401 matcher for progress, bookmarks and settings
- Route patterns in `app/api/bookmarks`, `app/api/settings`: same-origin check, strict Zod.
- `sanity/free-lessons.ts`: free-preview lookup by slug.

## Decisions

### Data (Drizzle schema `lib/db/schema.ts`, migrations in `drizzle/`)
- **`comments`:**
  - `id uuid pk default gen_random_uuid()`
  - `lesson_id text not null` (the Sanity lesson `_id`)
  - `parent_id uuid null references comments(id) on delete cascade`
  - `user_id text not null` (Clerk id)
  - `author_name text`, `author_image text`, `author_role text`: a snapshot taken at post time, so reads need no Clerk calls
  - `body text not null`, with a check constraint of 1–2,000 characters
  - `created_at timestamptz default now()`, `edited_at timestamptz`
  - `deleted_at timestamptz` (soft delete by the author), `hidden_at timestamptz` (admin)
  - indexes on `(lesson_id, created_at)` and `(parent_id)`
- **`comment_likes`:** `(comment_id, user_id)` primary key, `created_at`, cascade on comment delete.
- **`comment_reports`:** `(comment_id, user_id)` primary key, `reason text` (≤ 500), `created_at`, cascade.
- **Packages:** `drizzle-orm` (app queries over the existing pooled `pg` Pool) and `drizzle-kit` (dev).
- **Config:** `drizzle.config.ts` reads `DATABASE_URL_UNPOOLED`. Scripts: `db:generate`, `db:migrate`.
- **Rollout per the Neon skill:**
  1. Generate the migration.
  2. Create a temporary branch from `production` (`neon branch create`, with a 7-day expiry by the `neon.ts` policy).
  3. Apply and verify there (tables, constraints, an insert/select/delete smoke test).
  4. Apply to `production`.
  5. Delete the test branch.
  - `.env.local` is left as is: the test branch URL is passed only to the commands.

### Server (`lib/comments.ts`, server-only)
- Typed queries with Drizzle:
  - **list by lesson**: top-level comments plus their replies, like counts, "liked by me", "mine", hidden and deleted handling, report counts for admins
  - **create, edit, soft-delete, toggle like, report, toggle hide**
- **Roles:** `getRole(userId)` reads Clerk `publicMetadata.role` (`admin` | `instructor` | none) server-side.

### Routes (Node runtime; every write checks the Clerk session, same-origin JSON, strict Zod)
- **`GET /api/comments?lessonId=…&sort=top|new`**
  - The lesson must exist.
  - Signed out, allowed only when the lesson is free preview. Otherwise 401.
  - Returns view models only: no user ids except a `mine` flag, and `author_role` only as a badge.
- **`POST /api/comments`** `{ lessonId, body, parentId? }`:
  - The lesson must exist in Sanity.
  - The parent must be a visible top-level comment on the same lesson.
  - Rate limit **from the database**: at most 5 comments per minute and 30 per hour per user.
- **`PATCH /api/comments/[id]`** `{ body }`: author only, not deleted or hidden.
- **`DELETE /api/comments/[id]`**: author only. Soft delete (body cleared, `deleted_at` set).
- **`POST /api/comments/[id]/like`** `{ liked: boolean }`.
- **`POST /api/comments/[id]/report`** `{ reason }`: once per user, not on your own comment.
- **`POST /api/comments/[id]/hide`** `{ hidden: boolean }`: admins only.
- **Proxy:** `/api/comments` is **not** added to the blanket 401 matcher, because signed-out reads of free-preview lessons must work. Each handler enforces auth itself.

### UI
- **Tabs:** `LessonTabs` gains a **Discussion** tab. The count loads with the thread and appears in the tab label.
- **`components/comments/discussion.tsx`** (client):
  - Composer: textarea, character counter, Post (glossy pill). Signed out, a sign-in prompt instead.
  - Sort chips: Top / Newest.
  - List: avatar (author image or initial), name, Instructor badge, relative time ("3h ago", computed on the client), "edited", body.
  - Actions: like with count, Reply, then Edit, Delete and Report in a "…" menu.
  - Replies: indented. After 2, "View N more replies".
- **Body rendering:** plain text (React-escaped, `whitespace-pre-wrap`). Times matching `(\d{1,2}:)?\d{1,2}:\d{2}` (and within the video's length) become **timestamp chips**.
  - A chip dispatches a `roam:seek` window event. `YouTubePlayer` listens, seeks, plays, and scrolls the player into view.
  - If nothing handles it (Vimeo or Bunny), the chip falls back to the `?t=` URL.
- **Optimistic UI** for likes and posting, rolled back on error. Errors show inline.
- **Icons:** new icons render empty until the user uploads duotone versions to `assets/icons/`:
  - `heart` (like)
  - `chat` (Discussion tab and empty state)
  - `flag` (report)
  - `more` (the "…" menu)
  - `reply`

## Files
- `package.json` (`drizzle-orm`, `drizzle-kit`, scripts), `drizzle.config.ts`, `drizzle/` (migration)
- `lib/db/schema.ts`, `lib/db.ts` (Drizzle instance on the existing pool), `lib/comments.ts`
- `app/api/comments/route.ts`, `app/api/comments/[id]/route.ts`, `…/like/route.ts`, `…/report/route.ts`, `…/hide/route.ts`
- `components/comments/*`, `components/lesson-tabs.tsx`, `components/video-player.tsx` (`roam:seek` listener)
- `app/lessons/[slug]/page.tsx`, `.env.example` (documents the migration URL)

## Security
- **Writes:** Clerk session required, same-origin, JSON only, strict Zod, size limits, DB-backed rate limits.
- **Ownership:** edit and delete check `user_id = session user` in the SQL `WHERE`, so another user's comment is never touched.
- **Admin:** moderation checks the role server-side from Clerk.
- **Rendering:** plain text only, escaped by React. No HTML or markdown, so no XSS. Timestamp chips are built from regex matches, not markup.
- **Reads:** gated like the lesson itself (free preview or signed in). Responses never include other users' ids or emails.
- **SQL:** parameterized through Drizzle. Database secrets stay server-only.

## Acceptance
- Signed in:
  - post a comment and it appears at once
  - reply, like and unlike (count updates), edit ("edited"), delete ("Comment deleted", replies stay)
  - report (once)
  - Top / Newest sort works
- "Jump to 3:12" in a comment becomes a chip that seeks the YouTube player to 3:12.
- Admin: hide and unhide. Other users stop seeing a hidden comment.
- Signed out on a free-preview lesson: the thread is visible with a sign-in prompt. Writes return 401.
- The 6th comment within a minute is rejected with a friendly message.
- The migration is verified on a test branch, then applied to production, and the test branch is removed.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Migration:** `drizzle-kit migrate` on the test branch, schema verification, then production.
- **Live:**
  - `GET /api/comments` for a free lesson returns 200 when signed out, and 401 for a premium lesson
  - `POST` returns 401 when signed out
  - a DB smoke test of insert, like and soft delete (on the test branch)

## Manual test
1. `npm run dev`, sign in, open a lesson, then **Discussion**.
2. Post "Great explanation at 2:05". Click the 2:05 chip and the video jumps to 2:05.
3. Reply, like, edit, delete. Switch Top / Newest.
4. In the Clerk dashboard, set your user's `publicMetadata` to `{"role":"admin"}`, reload, and hide a comment. In a private window as another user, it's gone.
5. Sign out, open a free-preview lesson's Discussion. It's read-only with a sign-in prompt.

## Additions approved with this plan: more admin tools
- **Pin or unpin** a comment (`pinned_at timestamptz`). Pinned comments show first with a "Pinned" label. Top-level only.
- **Delete permanently** (admins; two-step confirm). The row is removed, and its replies, likes and reports cascade.
- **Reports:** admins see the report count and reasons on a comment, and can **dismiss reports** (removes its `comment_reports` rows).
- **Moderation page** `/admin/comments` (signed in via the proxy, then **admin role checked server-side**; anyone else gets 404):
  - a list of reported and/or hidden comments across all lessons, most-reported first
  - each row shows the lesson title (from Sanity), author, body, report reasons and dates
  - actions: Hide/Unhide, Dismiss reports, Delete permanently, Open lesson
  - filter chips: Reported / Hidden / All recent
- **Admin APIs**, all admin-only and server-checked:
  - `POST /api/comments/[id]/pin` `{ pinned }`
  - `DELETE /api/comments/[id]?permanent=1`
  - `POST /api/comments/[id]/reports/dismiss`
- **Choosing an admin:** Clerk dashboard → Users → user → Metadata → **Public** → `{"role":"admin"}` (or `"instructor"` for the badge). The role is read server-side from Clerk on each admin action.
