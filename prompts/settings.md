# Learner settings (`/settings`)

## Goal
A signed-in settings section with three tabs:
1. **Account:** Clerk's own profile component (name, photo, emails, password, connected accounts, sessions, delete account), embedded and themed. Nothing auth-related is rebuilt.
2. **Learning:** preferences the video player honors:
   - **default playback speed**
   - **captions on by default**
   - **resume where I left off** (on by default)
3. **Your data:**
   - **reset progress** for one course, with a confirmation step
   - **clear all bookmarks**, with a confirmation step
   - **download my data** as JSON

Entry points: a **Settings (gear) button next to the profile avatar** in the header, plus a "Settings" item inside the avatar menu.

## Docs and skills read
- AGENTS.md:
  - §5: writes only through server routes; tokens server-only.
  - §7: per-user state is keyed by the Clerk id and kept apart from content.
  - §12: protected routes are handled in the proxy; the Clerk secret key is server-only.
- Clerk (installed `@clerk/nextjs` 7): `UserProfile` with `routing="hash"`, `UserButton.MenuItems` / `UserButton.Link`, and backend `clerkClient().users.getUser` / `updateUserMetadata` (deep-merge; private metadata is never sent to the browser).
- Next 16: `cacheComponents` (per-user reads inside Suspense), route handlers.

## Code inspected
- `components/site-header.tsx`: the avatar is `UserButton` inside `<Show when="signed-in">`, with a notifications bell next to it.
- `app/layout.tsx`: `ClerkProvider` already has dark appearance variables, so `UserProfile` inherits the theme.
- `components/video-player.tsx`:
  - `YouTubePlayer` has rate state with `setPlaybackRate`, a captions toggle (`loadModule("captions")`), and `resume` / `resumeAt` logic.
  - It gets `start` and `resume` from `LessonVideo` in `app/lessons/[slug]/page.tsx`, which is already dynamic (it reads `searchParams`, inside Suspense).
- `lib/progress.ts` (`progressDocId`), `sanity/progress.ts`, `sanity/bookmarks.ts` (`bookmarksDocId`), `sanity/lib/write-client.ts`.
- `app/api/progress` and `app/api/bookmarks`: the pattern for auth, same-origin and Zod checks.
- `proxy.ts`: page and API matchers.

## Decisions

### Storage
- Preferences live in the **Clerk user's private metadata** (`privateMetadata.preferences`). They're readable and writable only with the server secret key, and travel with the account.
- No new Sanity type.
- Defaults are `{ playbackRate: 1, captions: false, resume: true }`.

### Server-only helpers (`lib/preferences.ts`)
- A Zod schema for preferences: `playbackRate` in `[0.75, 1, 1.25, 1.5, 1.75, 2]`, `captions` boolean, `resume` boolean.
- `readPreferences(userId)` merges stored values over the defaults and validates them, so bad data falls back to the defaults.

### Routes (all protected)
Every route checks the Clerk session, accepts only same-origin JSON writes, uses a strict Zod body, and returns `no-store` responses.
- `GET /api/settings`: the learner's preferences.
- `POST /api/settings`: the validated preferences. It calls `updateUserMetadata(userId, { privateMetadata: { preferences } })` and nothing else.
- `POST /api/settings/data { action: "reset-progress", courseId }`:
  - `courseId` must match `^course\.[a-z0-9-]+$`.
  - It deletes only `progress.<sessionUserId>.<courseKey>`, built from the **session** user id, never one sent by the client.
- `POST /api/settings/data { action: "clear-bookmarks" }`: deletes `bookmarks.<sessionUserId>`.
- `GET /api/settings/data`:
  - Downloads `roam-data.json` (`Content-Disposition: attachment`): the learner's own progress (course title, lessons with position and completed) and bookmarks (kind, id, saved date).
  - Read with `no-store`. It contains no tokens and no other users' data.
- The proxy adds `/settings(.*)` to the protected pages and `/api/settings(.*)` to the protected APIs (401 JSON).

### Page `app/settings/page.tsx`
- Gated. Same frame as My Learning: `SiteHeader`, `max-w-5xl`, title "Settings" and a subtitle, `SiteFooter`.
- **Tabs** as links (`?tab=account|learning|data`, default `account`): glossy-pill active style like the catalog chips; a horizontal row on mobile, a left column on `lg`.
- **Account:** `<UserProfile routing="hash" />` inside a raised panel, so no catch-all route is needed.
- **Learning** (server reads the preferences behind Suspense; a client form edits them):
  - speed as segmented chips (0.75× to 2×)
  - captions and resume as switches (accessible `role="switch"` buttons)
  - **Save changes** (glossy pill), disabled until something changes, with a "Saved" confirmation
  - On error the values roll back with a message.
- **Your data** (server lists the learner's started courses from their progress docs, by title):
  - each course row has a **Reset progress** button. Two-step confirm: the first click turns into "Confirm reset", which expires after 5 seconds.
  - a **Clear all bookmarks** row with the same confirm
  - a **Download my data** button
  - After a reset or clear, the page refreshes (`router.refresh()`).
- **Copy:** each destructive action says plainly that it can't be undone.

### Player honors the preferences
- `LessonVideo` (already dynamic) calls `auth()`. When signed in, it reads the preferences server-side and passes them to `VideoPlayer`.
- `YouTubePlayer`:
  - initial rate state comes from `preferences.playbackRate`, applied with `setPlaybackRate` in `onReady`
  - captions start on when `preferences.captions` is true (module loaded in `onReady`)
  - `resume` becomes `resume && preferences.resume`, so turning resume off always starts lessons from the beginning (`?t=` links still win)
- Signed out (free-preview lessons): the defaults, as today.

### Header
- Signed in, a gear icon button (`settings` icon, same style as the bell) links to `/settings`, placed before the avatar.
- `UserButton` gains `<UserButton.MenuItems><UserButton.Link label="Settings" href="/settings" … /></UserButton.MenuItems>`.

## Files
- `lib/preferences.ts` (new)
- `app/api/settings/route.ts`, `app/api/settings/data/route.ts` (new)
- `app/settings/page.tsx`, `components/settings/*` (new: tabs, preferences form, data actions, account panel)
- `components/site-header.tsx`, `components/video-player.tsx`, `app/lessons/[slug]/page.tsx`
- `proxy.ts`

## Security
- All settings pages and APIs are behind sign-in in the proxy, and every route re-checks `auth()`.
- Writes are same-origin JSON with strict Zod validation (enumerated speeds, booleans only, regex course id).
- Document ids are always built from the **session** user id, so one learner can't touch another's data.
- Preferences are in Clerk **private** metadata, which the browser can't read or write directly.
- The Sanity write token and Clerk secret are used only in server routes. Responses are `no-store`.
- Destructive actions need a two-step confirm, and the export contains only the learner's own records.
- Account security (password, sessions, delete) stays entirely with Clerk.

## Acceptance
- Signed out, `/settings` redirects to sign-in and `/api/settings` returns 401.
- Signed in, the gear button and the avatar menu "Settings" both open `/settings`. The tabs switch and are linkable.
- Account shows Clerk's profile in the dark theme.
- **Learning:** change the speed to 1.5× and turn captions on, then save. A lesson starts at 1.5× with captions. With resume off, a lesson starts at 0:00, while a `?t=` link still jumps.
- **Data:**
  - Reset a course: its progress disappears from My Learning and the course page.
  - Clear bookmarks: Saved is empty.
  - Download returns a JSON file with only your own data.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live, signed out: `/settings` returns 307 and `/api/settings` and `/api/settings/data` return 401.

## Manual test
1. `npm run dev`, sign in, click the gear next to your avatar. Also try avatar → Settings.
2. On Account, edit your name and check it updates.
3. On Learning, set 1.5× and captions on, save, then open a lesson and press play.
4. Turn resume off, save, then open a half-watched lesson. It should start from 0:00.
5. On Your data, download the JSON, reset one course (confirm), check My Learning, then clear bookmarks and check `/courses?view=saved`.
6. Sign out and open `/settings`. You should get the sign-in prompt.
