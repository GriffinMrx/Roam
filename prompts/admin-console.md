# Admin console: monitor everything, manage users and admins, locked down

## Goal
One admin area at `/admin`, laid out like Settings (site header, left menu, compact cards, site footer). From it the owner can:
- monitor the whole app
- manage users, admins, teacher courses and comments
- see an audit trail of every admin action

It must be secure first.

## Skills and code inspected
- **Skills:** AGENTS.md (§5 boundaries, §12 secrets: Clerk secret server only, writes through server routes) and the Next 16 docs (route handlers, `connection`, Suspense with cacheComponents).
- `components/settings/settings-shell.tsx`: the menu and `Panel` design to mirror.
- `app/settings/page.tsx`: how pages use the shell.
- **Existing admin pages, each standalone:**
  - `app/admin/courses/page.tsx` (review queue)
  - `app/admin/comments/page.tsx` (moderation)
  - `app/admin/insights/page.tsx` (survey insights)
- **Existing admin routes:** `app/api/admin/courses/[id]` (decide), `app/api/admin/insights` (CSV).
- `lib/roles.ts`: the role lives in Clerk `publicMetadata.role` and is read on the server with `clerkClient` on every request, so a demotion applies at once.
- `lib/comments-route.ts` `guardWrite`: session, same-origin (CSRF), strict Zod.
- `proxy.ts`: `/admin(.*)` already requires sign-in; `/api/admin(.*)` returns 401 when signed out.
- **Clerk 7.9:** server `auth().has({ reverification })` with `reverificationError`, and client `useReverification`, for step-up re-authentication.
- **Neon tables:** comments, reports, teacher_*, user_profiles, user_badges, teacher_progress. **Sanity:** progress, bookmarks, courseReview.

## Decisions

### Roles
- **Owner:** the user ids in a new server-only env var `ROAM_OWNER_USER_IDS` (comma separated). The owner can't be changed, removed or demoted from the UI, and is always an admin. I set it to your current admin account (the only admin today) in `.env.local` and add it to `.env.example` (empty).
- **Admin:** a row in a new Neon `admins` table, added only by the owner. This changed during the build: Clerk can't list users by metadata, so admins couldn't be listed. A database row also can't be set by anything outside our server routes. Clerk metadata no longer makes anyone an admin, and the role is re-read on every request.
  - Admins can monitor, moderate comments, review courses and ban or unban learners.
  - Only the owner adds or removes admins, acts on other admins, or deletes accounts.

### Pages (all inside a new `AdminShell` that mirrors `SettingsShell`)
- **Overview** (`/admin`):
  - users (total, new in 7 and 30 days)
  - onboarding answers
  - teachers
  - teacher courses by status, with the pending review count
  - open comment reports, and comments in the last 7 days
  - lessons completed (Sanity and Neon)
  - badges awarded
  - recent sign-ups and recent admin actions
- **Users** (`/admin/users`): search by name or email (Clerk), paginated. Each row shows role, teacher, onboarded, banned, joined and last active.
- **User detail** (`/admin/users/[id]`):
  - **Profile:** account details and survey answers.
  - **Activity:** teacher profile and courses, comment count, reports against them, and courses in progress or completed.
  - **Actions:**
    - sign out all sessions
    - ban or unban
    - make admin or remove admin (owner only)
    - delete account (owner only, typed confirmation)
- **Admins** (`/admin/admins`, owner only): owners (read-only), the admin list, and "Add admin" by email of an existing account.
- **Course review** (`/admin/courses`), **Comments** (`/admin/comments`) and **Insights** (`/admin/insights`): the existing pages, moved into the shell. They behave the same; Course review also links to the Studio's Course Review tool.
- **Audit log** (`/admin/audit`): every admin action, newest first, filterable by action. Read-only, with no delete in the UI.
- **Sanity Studio:** a menu link that opens Studio for editorial content (`NEXT_PUBLIC_SANITY_STUDIO_URL`, default `http://localhost:3333`). Content editing stays in Studio (AGENTS §5).

### Security steps
1. **Server checks everywhere:**
   - Every admin page and route calls `requireAdmin()` or `requireOwner()`, which reads the role fresh from Clerk on the server.
   - Non-admins get a 404, so the area's existence isn't revealed. The proxy keeps requiring sign-in.
2. **Step-up re-authentication** for sensitive actions (admin changes, ban, sign out sessions, delete):
   - The server requires a Clerk reverification within the last 10 minutes (`strict`), or it answers with Clerk's reverification error.
   - The client wraps these calls in `useReverification`, so Clerk asks for the password or 2FA code again.
3. **Optional 2FA requirement:** with `ADMIN_REQUIRE_MFA=true`, admins without two-factor auth can't open the console. It's off by default so you can't lock yourself out; turn it on once your 2FA is set up. The console shows a warning while 2FA is off.
4. **Audit log:** a new append-only Neon table `admin_audit` records actor, action, target, details, IP and user agent for every admin write, inside the same request. A database trigger (migration 0004) refuses UPDATE, DELETE and TRUNCATE on it.
5. **Hierarchy rules, enforced on the server:**
   - Nobody can act on themselves (ban, demote, delete) or on an owner.
   - Admins can't act on other admins; only the owner can.
   - The last admin can't be removed.
6. **Write guards:** same-origin (CSRF), JSON only, strict Zod with an unknown-key reject, and an admin write rate limit of 30 a minute per admin.
7. **Headers for `/admin` and `/api/admin`:** `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` (no clickjacking), `Referrer-Policy: same-origin`. Set in `next.config.ts`.
8. **No secrets or tokens reach the browser.** Clerk admin calls (ban, delete, sessions, metadata) run only in server routes with the secret key. User emails show only to admins, and the CSV export still leaves out user ids.

## Files
- **New:**
  - `lib/admin.ts`: `requireAdmin`, `requireOwner`, `isOwner`, hierarchy checks, reverification check, audit writer, rate limit.
  - `lib/admin-stats.ts`
  - `components/admin/admin-shell.tsx`
  - `components/admin/user-actions.tsx`
  - `components/admin/admin-list.tsx`
  - `app/admin/page.tsx`
  - `app/admin/users/page.tsx`
  - `app/admin/users/[id]/page.tsx`
  - `app/admin/admins/page.tsx`
  - `app/admin/audit/page.tsx`
  - `app/api/admin/users/[id]/route.ts` (ban, unban, sign out, role, delete)
  - `app/api/admin/admins/route.ts` (add by email)
- **Changed:**
  - `lib/db/schema.ts` (+ `admin_audit`, migration 0003)
  - `lib/roles.ts`
  - the three existing admin pages (into the shell)
  - `app/api/admin/courses/[id]/route.ts` and the comment moderation routes (audit log entries)
  - `next.config.ts` (headers)
  - `.env.example`, `.env.local` (owner id; not a secret)
  - No navbar link: at the owner's request, nothing on the site points to the console. It's reached by typing `/admin`.

## Acceptance
- A non-admin opening any `/admin` URL gets a 404. Any `/api/admin` call from them returns 404, or 401 when signed out.
- An admin sees Overview, Users, Course review, Comments, Insights and Audit. Only the owner sees Admins and the owner-only actions.
- Sensitive actions prompt Clerk re-verification, then succeed, and appear in the audit log.
- The owner can't be banned, demoted or deleted from the UI. An admin can't act on another admin.

## Checks
- tsc, lint and build.
- The migration is applied.
- Route checks: signed out gets 401; a signed-in non-admin gets 404 (temporary test accounts, deleted afterwards).
- Screenshots of the console in both themes.

## Manual test
1. As the owner, open `/admin`: Overview with live numbers, and the sidebar like Settings.
2. Users: search for an account and open it. Ban it: Clerk asks you to verify, the account shows "Banned", and the Audit log has the entry. Unban it.
3. Admins: add an admin by email. Sign in as them: they see the console but not Admins, and can't ban you.
4. Course review, Comments and Insights work as before inside the new layout.
