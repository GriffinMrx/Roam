# Teachers, phase 1: become a teacher, build courses, admin review, moderate your comments

## Goal
Let regular users become teachers who publish their own courses, manage them (create, edit, delete) and moderate the discussion on their lessons. A course goes public only after an admin approves it.

This is phase 1 of 2 (the phase plan is at the end). Badges: the **Teacher badge** ships now. **Course completion** and **milestone** badges come in phase 2, because they need progress tracking on teacher courses.

## Decisions (from you)
- **Roles:**
  - Everyone starts as a **regular user (learner)**.
  - Right after sign-up, the new user chooses **Learner** or **Teacher**.
  - A learner can switch later with a **"Become a Teacher"** button at the top of the Settings menu.
- **Publishing:** the teacher submits the course, an **admin approves it**, and then it's live.
- **Videos:** **pasted links** (YouTube, Vimeo or Bunny), the same as today's lessons. No file uploads and no storage costs.
- **Badges:** Teacher, course completion and milestone badges (the last two in phase 2).
- **Storage:** teacher courses live in **Neon Postgres**, next to comments.

## Heads-up on the storage choice
- **Deviates from AGENTS.md:** it says content is authored in Sanity. Teacher courses in Neon is a deliberate exception: Sanity stays the source for the existing (editorial) courses, and Neon holds user-made courses.
- **Every page merges two sources:** each public page reads Sanity first, then Neon (details below).
- **Future AI search:** it will also need to read Neon courses. That's noted for the search work, not built now.

## Skills and docs read
- **AGENTS.md:**
  - §5: boundaries. The browser never writes; every write goes through a server route.
  - §7 and §12: Clerk roles are checked on the server, and secrets stay server-only.
- **`node_modules/next/dist/docs`:** `'use cache'`, `cacheTag` and `revalidateTag` (so approved courses appear without a redeploy), plus route handlers and `cacheComponents` rules (auth reads inside Suspense).
- **The neon-postgres skill:** a pooled connection for the app, Drizzle migrations over the unpooled connection.

## Code inspected
- **Roles:** Clerk `publicMetadata.role` with values `admin` | `instructor`, read in `lib/comments.ts` (`getRole`). Moderation (hide, pin, dismiss reports) is admin-only. Comments already store and show `authorRole`.
- **Database:**
  - `lib/db/schema.ts` defines `comments`, `comment_likes` and `comment_reports`, keyed by `lesson_id` (text).
  - Drizzle migrations live in `drizzle/`.
  - `lib/comments-route.ts` provides `guardWrite`: Clerk session, same-origin check, strict Zod validation.
- **Pages:**
  - `/courses/[slug]`, `/lessons/[slug]` and `/instructors/[slug]` read Sanity through `sanity/data.ts`. They're prerendered with `generateStaticParams` and cached (`'use cache'` and Sanity Live).
  - The catalog and home page use `getCourses()`.
- **Proxy:**
  - `/courses/*` and admin pages need sign-in.
  - Lessons need sign-in unless they're a free preview (`sanity/free-lessons.ts`).
- **Progress and bookmarks:** stored in Sanity as references to Sanity lessons and courses. They can't point at Neon lessons, hence phase 2.
- **Shared code to reuse:**
  - `lib/video.ts`: `parseVideoUrl` and `youtubeThumbnail`, the provider check and thumbnail.
  - Settings: the menu-and-cards layout.
  - `/admin/comments`: the admin page pattern.

## Data model (Neon, new Drizzle migration)
**`teacher_profiles`**
- `user_id` (PK, Clerk id), `slug` (unique), `name`, `headline`, `bio`, `expertise text[]`, `photo_url` (Clerk avatar), and timestamps.

**`teacher_courses`**
- **Identity:** `id` (uuid), `owner_id`, `slug` (unique).
- **Card fields:** `title`, `summary` (≤ 240), `level` (`beginner` | `intermediate` | `advanced`), `price` (0 means free), `category_slug` (one of the Sanity categories).
- **Learning outcomes:** `learning_outcomes jsonb` (≤ 6 × {icon, title, description}, using the existing icon keys).
- **Status:** `status` (`draft` | `pending` | `published` | `rejected`) and `review_note`.
- **Timestamps:** `submitted_at`, `published_at`, `created_at` and `updated_at`.

**`teacher_modules`**
- `id`, `course_id` (FK, cascade), `position`, `title`, `summary`.

**`teacher_lessons`**
- **Identity:** `id`, `course_id` and `module_id` (FK, cascade), `position`, `slug` (unique).
- **Basics:** `title`, `summary`, `video_url` (validated: YouTube, Vimeo or Bunny), `duration_seconds`, `free_preview`.
- **Content:**
  - `notes text[]` (paragraphs, turned into Portable Text blocks when read, so the existing renderer works)
  - `key_points text[]` (≤ 6)
  - `pro_tip`
  - `resources jsonb` (≤ 8 × {type, title, description, url})

**Ids, slugs and limits:**
- **Comment ids:** teacher lesson ids are exposed to the comments code as `tl-<uuid>`, so they can't collide with Sanity `_id`s.
- **Slugs:** generated from the title. On a collision with either Sanity or Neon, `-2`, `-3`, … is added.
- **Limits:** 20 courses per teacher, 12 modules per course, 30 lessons per module, plus text-length checks in both Zod and SQL.

## Features
1. **Choosing a role at sign-up:**
   - After sign-up, Clerk redirects to a new **`/onboarding`** page with two cards, **"I want to learn"** and **"I want to teach"**.
   - Learner keeps the default role.
   - Teacher shows a short profile form (display name, headline, expertise tags and bio, with the Clerk avatar as photo). Saving it sets the `instructor` role and creates the teacher profile.
   - Skipping the page means learner.
2. **"Become a Teacher":**
   - **For learners:** a glossy button at the top of the Settings menu opens the same teacher profile form.
   - **For teachers:** the button is replaced by a **Teaching** group in the menu, with:
     - **My courses**
     - **Comments**
     - **Teacher profile**
3. **My courses (teacher dashboard)**, in the Settings menu-and-cards style:
   - **List:** the teacher's courses, each with a status badge (Draft, In review, Published, Rejected with the admin's note), plus "New course".
   - **Course editor** (`/settings/teaching/courses/[id]`):
     - **Course details:** title, summary, level, price, category and up to 6 learning outcomes.
     - **Modules and lessons:**
       - add, rename, reorder (up and down) and delete
       - each lesson has its title, summary, video link, duration (mm:ss), free-preview toggle, notes, key points, pro tip and resources
     - **Live checks:** the video link is checked as you type, with a thumbnail preview for YouTube.
     - **Saving:** "Save draft" saves at any time.
     - **Submitting:** "Submit for review" needs at least 1 module with 1 lesson and every required field filled.
     - **Cover:** the first lesson's YouTube thumbnail. Without one, the existing monogram cover is used, so there's no image upload.
   - **After approval:** edits to a published course go live right away; the course was already vetted. Admins can unpublish at any time.
   - **Delete:** with a confirm step. It deletes the course, its modules and lessons, and their comments.
4. **Admin review** (new **`/admin/courses`**, admins only, the same style as `/admin/comments`):
   - **Queue:** pending courses come first, then published and rejected ones.
   - **Actions:** preview the course (opens the course page in preview mode), **Approve**, **Reject** (with a required note shown to the teacher) and **Unpublish**.
5. **Where published teacher courses appear** (Sanity first, then Neon, both cached; approve, edit and delete refresh the cache tag):
   - **Lists:** the catalog `/courses` and the home page grid and search, with the same card and filters.
   - **Course page:**
     - modules, outcomes and instructor
     - the "Start Learning" button opens the first lesson
     - the progress and bookmark parts are hidden until phase 2
   - **Lesson page:**
     - **Content:** the video player (all features: timestamps, keyboard shortcuts, captions), notes, key points, pro tip, resources and the sidebar.
     - **Discussion:** on, with the teacher as moderator.
     - **Progress saving:** off until phase 2.
   - **Instructor page `/instructors/[slug]`:** the teacher's profile and published courses.
   - **Access:** the same rules as today. Courses need sign-in, and lessons need sign-in unless they're a free preview; the proxy's free-preview check also looks in Neon.
6. **Teachers moderate their own lessons:**
   - On their own lessons' discussions, teachers can pin, hide and delete any comment, and dismiss reports, the same tools admins have.
   - The server checks that the comment's lesson belongs to a course they own.
   - **Comments** in the Teaching menu lists recent and reported comments on their lessons, with the same moderation actions.
7. **Teacher badge:** a "Teacher" badge next to the teacher's name:
   - in comments (it uses the existing `authorRole`)
   - on their instructor page
   - on their course pages, by the instructor name

## Security
- **Every write is a server route** under `app/api/teach/*` and `app/api/admin/courses/*`, using `guardWrite` (Clerk session, same-origin, strict Zod).
- **Ownership:** every course, module and lesson write runs `WHERE owner_id = <session user>`, so a teacher can't touch another teacher's course.
- **Roles:**
  - Admin actions check `role === "admin"` on the server.
  - Teacher actions check `role === "instructor"`.
  - The role is set only by the onboarding and "Become a Teacher" routes, never from the request body.
  - It can never be raised to admin, and an existing admin is never downgraded.
- **Links:**
  - Video links must parse as YouTube, Vimeo or Bunny.
  - Resource links must be `https`.
  - Everything teachers write is shown as plain text, never as HTML.
- **Visibility:** drafts, pending and rejected courses are visible only to the owner and admins. Public reads return `published` only.
- **Rate limits:** on create and update routes (per user per minute), as in comments.
- **Secrets:** the Clerk secret and database URL stay on the server, and nothing new is exposed to the browser.

## Files (expected)
**New:**
- **Database and server code:**
  - `drizzle/0001_*.sql`, plus the schema additions in `lib/db/schema.ts`
  - `lib/teach/` (data access, validation, slugs, mapping to the page shapes)
  - `lib/roles.ts` (shared role helpers; `lib/comments.ts` switches to them)
- **Routes:**
  - `app/onboarding/page.tsx`
  - `app/settings/teaching/...` (dashboard, editor, comments, profile)
  - `app/admin/courses/page.tsx`
  - API routes under `app/api/teach/*` and `app/api/admin/courses/*`
- **Components:** the editor's client components in `components/teach/*`.

**Edited:**
- **Pages:** `app/courses/page.tsx`, `app/page.tsx`, `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`, `app/instructors/[slug]/page.tsx`, `app/settings/page.tsx`
- **Server code and access:** `proxy.ts`, `lib/comments.ts`, `sanity/free-lessons.ts`
- **Components:** `components/comments/discussion.tsx` (the Teacher badge and teacher moderation), the sign-up page (redirect to onboarding)

## Acceptance
1. A new sign-up lands on `/onboarding`. Choosing Teacher and saving the profile makes the user a teacher; Learner (or skipping) leaves them a learner.
2. A learner sees "Become a Teacher" at the top of the Settings menu, and it works.
3. A teacher can:
   - create a course with modules and lessons (video links)
   - save a draft
   - submit it, which sets the status to In review
   - edit, reorder and delete
4. The admin sees the course in `/admin/courses`, previews it, and approves or rejects it with a note the teacher sees.
5. An approved course appears in the catalog, home search, its course page, its lesson pages (video plays, timestamps work) and the teacher's instructor page, without a redeploy.
6. On their own lessons, the teacher can pin, hide and delete comments and dismiss reports. On anyone else's lessons they can't (403).
7. The Teacher badge shows in comments, on the instructor page and on the course page.
8. A teacher can't read or change another teacher's draft (403 or 404). Learners can't call teacher routes.
9. Existing Sanity courses, progress, bookmarks and comments work exactly as before.
10. `tsc`, lint and build pass, and the migration applies cleanly.

## Checks
- `npm run db:generate`, review the SQL, `npm run db:migrate`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Server-side route checks** (curl): every route without a session returns 401, and a cross-origin request returns 403.
- **Data checks** with a script against the database: creating, reading and filtering a test course by owner and status, then cleaning it up.
- **What you test signed in:** the full flow needs real signed-in users (a teacher and an admin). I'll give you exact steps, since I can't sign in.

## Manual test
1. Sign up a new account: choose **I want to teach** and fill the profile.
2. Settings → Teaching → My courses → **New course**. Add 1 module with 2 lessons (paste YouTube links), then **Submit for review**.
3. With your admin account, open `/admin/courses` → Preview → **Approve**.
4. Open `/courses`: the new course is there. Open it, play a lesson and post a comment as a learner.
5. As the teacher, pin and then hide that comment, and check the Teacher badge.
6. As the teacher, edit the course title (it updates live), then delete the course.

## Phase 2 (next prompt, not built now)
- **Progress and bookmarks for teacher courses:** a Neon progress table keyed by Clerk user id and teacher lesson id, with the existing UI (completion marks, resume, My Learning).
- **Badges:**
  - **Course completion:** one badge per finished course, for all courses.
  - **Milestones:** first lesson, 10 lessons, first course, 3 courses.
  - Shown on My Learning, with a small toast when one is earned.
- **Teacher stats:** students per course and lessons completed.
