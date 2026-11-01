# Onboarding page and survey, navbar button, Studio course review, and teachers phase 2

Five parts, built in this order. Each part is checked before the next one starts.

## Part A: standalone onboarding page (reference: the "Corinna AI" sign-up screen)
**Layout:** `/onboarding` becomes a full-screen page with no site header or footer, split into two halves like the reference.
- **Left half**
  - **Header:** the Roam logo at the top left.
  - **Steps:** each step has a large heading, then a short muted line, then its content.
  - **Choice cards:**
    - **Card:** a rounded bordered card with an icon tile on the left, a title and a muted description.
    - **Selected:** an accent-colored border, plus a small filled dot in the top-right corner.
  - **Continue:** a full-width dark **Continue** button.
  - **Progress:** a segmented progress bar at the bottom, one segment per step, with completed segments filled.
- **Right half:** a lighter panel with a large two-line heading ("Learn anything. Teach what you know.") and a muted sub-line.
  - **App preview:** below the heading, a tilted screenshot of the Roam catalog in a device frame, like the reference's dashboard.
  - **Screenshot file:** captured from the real app and saved as `public/onboarding/preview.png`.
  - **Phones:** the right half is hidden.
- **Theme and colors:** the page follows the active theme (dark by default). The reference's orange becomes Roam's purple (`primary-500`) for the selected border, the dot and the filled progress segments.

**Steps:**
1. **"How will you use Roam?"** Two choice cards:
   - "I want to learn", described as "Take courses and track your progress".
   - "I want to teach", described as "Publish your own video courses".

   Arriving from **Become a Teacher** pre-selects Teach.
2. **"Tell us about yourself"** (the survey, Part C). It's skipped if the user already answered it.
3. **Last step:**
   - **Learner: "Recommended for you".** Up to 4 course cards matched to their answers (interests, then level, then popular), each linking to the course. Then a **Start learning** button.
   - **Teacher:** the teacher profile form from phase 1 (name, headline, expertise, bio), then on to **My courses**.

**Removed from Settings:**
- The "Become a Teacher" button and the becoming-a-teacher form.
- Settings → Teacher profile now opens only for teachers, who keep **My courses**, **Comments** and **Teacher profile** as they are.
- A non-teacher who opens a teaching tab is redirected to `/onboarding?role=teacher`.

**Unchanged:** sign-up still redirects new accounts to `/onboarding`.

## Part B: navbar button (reference: the "Create Group" pill)
- **The button:** next to the bell, a compact dark pill (`bg-neutral-100`, a subtle border, white text, a small circular icon before the label, ~36px tall, rounded-full). It looks like "Create Group" in both themes.
- **What it says:**
  - **Signed out, or a learner:** **Become a Teacher**, linking to `/onboarding?role=teacher`. Signed-out users sign in first, then land there.
  - **Teacher:** **Create Course**, linking to Settings → My courses.
- **Hidden on phones** (below `sm`), like the nav links.
- **How it decides:** from the Clerk user's public role on the client, so the header stays cached.

## Part C: survey data, plus your view of it
**Answers are stored in Neon (`user_profiles`), one row per user keyed by Clerk id.** Every question is optional except the first.

| Question | Options |
|---|---|
| What best describes you? | High school student · College or university student · Working professional · Career switcher · Teacher or educator · Other |
| How did you hear about Roam? | Search engine · YouTube · TikTok or Instagram · X (Twitter) · Friend or colleague · School or workplace · Other (with a text box) |
| What do you want to achieve? (multi) | Learn a new skill · Advance my career · Help with school · Personal interest · Teach others |
| Which topics interest you? (multi) | The live categories from Sanity |
| Your experience level | Beginner · Intermediate · Advanced |
| How much time per week can you learn? | Under 1 hour · 1–3 hours · 3–5 hours · 5+ hours |

**Where it's used and how it's protected:**
- **Recommendations:** these answers drive the Recommendations step.
- **Saving:** answers go through `POST /api/onboarding`, using the Clerk session, a same-origin check and strict Zod validation. The browser never writes to the database directly.
- **Insights page (new, admins only) at `/admin/insights`:**
  - counts and percentages for every answer, with simple bar rows
  - totals and sign-ups per week
  - a CSV export
  - It lets you see who your users are and where they come from.

## Part D: Studio course review dashboard
**The goal:** you approve teacher courses inside Sanity Studio.

**How it works:** the review decision is stored in Sanity. The site already listens to Sanity live events, so the moment you click Approve in Studio, the course appears on the site, with no webhook or deployment needed. This works locally too.

1. **New Studio document type `courseReview`** (system data, not editable content). One per teacher course, with id `courseReview.<courseId>`.
   - **The decision:** `courseId`, then `status` (`pending` · `approved` · `changesRequested` · `unpublished`) and a `note` for the teacher.
   - **Who and when:** `title`, `teacherName`, `submittedAt`, `decidedAt`.
   - **The outline:** an `outline` snapshot (modules, then lessons with title, length, video link and free-preview flag), so you can review without leaving Studio.
2. **Course Review tool** (a custom tool in the Studio's top bar):
   - **Lists:** Pending first, then Approved, then Changes requested, each course as a card showing the teacher, category, level, lesson count and length.
   - **Preview:** the expandable outline, with YouTube thumbnails and links that open each video in a new tab.
   - **Actions:** **Approve**, **Request changes** (with a note) and **Unpublish** (with a note).
   - **Who can act:** the buttons update the review document with your own Studio permissions, so only project members can approve.
   - **Structure menu:** also a "Course reviews" list for the raw documents.
3. **The site's side:**
   - **Submitting:** a teacher's **Submit for review** creates or refreshes the review document (status `pending`, plus the outline snapshot) through the server-only write token.
   - **Public pages:** they show a teacher course only when its review status is `approved` (read through the cached, live-updating Sanity fetch).
   - **The teacher's status badge** comes from the review: Draft · In review · Published · Changes needed (with your note).
   - **Deleting a course** deletes its review document.
   - **`/admin/courses` stays as a second way to review:** its buttons now update the same Sanity review document, so Studio and the site never disagree.
4. **Deploys:** the schema is deployed (`sanity schema deploy`) and the Studio is redeployed (`sanity deploy`) so the tool appears for the Context MCP and online. Locally, `npm run dev` in `studio/` shows it right away.

## Part E: teachers phase 2 (progress, bookmarks, My Learning, badges, teacher stats)
1. **Progress for teacher courses:**
   - **Storage:** a new Neon table `teacher_progress` (user, lesson, course, position, duration, completed, timestamps).
   - **Routes:** `GET/POST /api/progress` accept teacher course ids (`tc-…`) and lesson ids (`tl-…`) and store them in Neon. Editorial courses still use Sanity, unchanged.
   - **Pages:** course and lesson pages turn progress back on for teacher courses: completion checks, %, resume, Continue Learning and the sidebar progress.
2. **Bookmarks for teacher courses:** a Neon table `teacher_bookmarks`. `POST /api/bookmarks` and the saved lists accept teacher ids. The bookmark button comes back on teacher course and lesson pages.
3. **My Learning:** merges teacher-course progress and bookmarks with the editorial ones (continue watching, in progress, completed, saved).
4. **Badges:** a Neon table `user_badges` (user, badge key, earned at).
   - **The badges:**
     - **Course completion:** one per finished course, for both kinds of course.
     - **Milestones:** First lesson · 10 lessons · First course finished · 3 courses finished.
   - **When they're awarded:** on the progress write that earns them. Progress learners already have is credited the first time they open My Learning.
   - **Where they show:**
     - a **Badges** section on My Learning (earned, plus locked milestones dimmed)
     - a small toast in the player when one is earned
   - **Teacher badge:** unchanged from phase 1.
5. **Teacher stats:**
   - **In My courses:** students (learners with any progress) and lessons completed, per course.
   - **On the site:** the teacher course's public student count uses the same number.

## Skills and docs read
- **AGENTS.md:**
  - §5, §7, §12: server-only writes and tokens. Writes to Sanity go only through server routes with the write token; Studio actions use the Studio user's own permissions.
  - §13: deploy the Studio and the schema.
- **The sanity-best-practices skill:** schema, a Studio custom tool, the structure menu, and Live content.
- **`node_modules/next/dist/docs`:** `'use cache'` and cache tags.
- **Neon:** Drizzle migrations.

## Security
- Answers, progress, bookmarks and badges are keyed by the Clerk id from the session, and only server routes write them.
- The review decision can be changed only by Sanity project members (Studio) or Clerk admins (`/admin/courses`, through the server write token). Teachers can only move their own course to `pending`.
- The insights page and CSV export are admin-only, checked on the server. They show totals; the CSV has answers and dates but no names or emails.
- Survey text answers are capped (120 characters) and shown as plain text.

## Acceptance
1. A new sign-up lands on the split onboarding page. It matches the reference's structure in Roam's colors and works in both themes. Steps go role → about you → recommendations or teacher profile.
2. The navbar shows **Become a Teacher** (or **Create Course** for teachers) next to the bell, styled like "Create Group".
3. Settings has no becoming-a-teacher UI. Teachers keep the Teaching section.
4. Answers are saved and shown in `/admin/insights`, and the CSV downloads.
5. Approving a submitted course in the Studio's **Course Review** tool makes it appear on the site without a redeploy. Requesting changes shows your note to the teacher.
6. On a teacher course, watching a lesson marks it complete, resume works, it shows in My Learning, and bookmarks work.
7. Finishing a first lesson earns "First lesson", with a toast. Finishing a course earns its completion badge. Both show on My Learning.
8. My courses shows student and completion counts.
9. Editorial courses, progress, bookmarks and comments behave exactly as before.
10. `tsc`, lint and build pass in the web app. The Studio builds. The migration applies, and the schema and Studio deploy.

## Checks
- **Web:** `npx tsc --noEmit`, `npm run lint`, `npm run build`, plus `db:generate` and `db:migrate`.
- **Studio:** `npx sanity build`, `npx sanity schema deploy`, `npx sanity deploy`.
- **Live (headless Chrome):** the onboarding page in both themes, and the navbar button.
- **Fixture checks:** a test teacher course with a Sanity review document:
  - pending: hidden
  - approved, made the way the Studio tool does it: visible after the live refresh
  - changes requested: hidden again
- **Store tests (`tsx`):** progress writes, badge awards and the bookmark merge against Neon. Then all test data is removed.
- **Signed-in flows I can't run myself** (sign-up, the player toast) get exact manual steps.

## Manual test
1. Sign up a new account. Go through the onboarding as a learner: pick topics, then see the recommendations.
2. Click **Become a Teacher** in the navbar and finish the teacher steps. The navbar now says **Create Course**.
3. Create a course and submit it.
4. Open Studio (`cd studio && npm run dev`) → **Course Review** → Approve. The course appears on `/courses`.
5. As a learner, watch a teacher lesson to the end: a "First lesson" badge toast appears, and My Learning lists the course and badge.
6. As an admin, open `/admin/insights`: your answers are counted. Download the CSV.
