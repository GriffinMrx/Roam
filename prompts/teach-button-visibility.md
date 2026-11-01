# Navbar teach button: hide for signed-out visitors, never "Become a Teacher" for teachers

## Goal
- Signed-out visitors see no teach pill in the navbar.
- Anyone who finished teacher onboarding (has a teacher profile) never sees "Become a Teacher" again; they see "Create Course".

## Code inspected
- `components/teach-button.tsx`: shows the pill whenever Clerk is loaded; "teacher" means `publicMetadata.role === "instructor"`.
- `lib/roles.ts` `grantTeacherRole`: skips admins entirely, so an admin who becomes a teacher keeps `role: "admin"` and the navbar still says "Become a Teacher". This is the bug the owner hits.
- `app/settings/page.tsx`: the server treats "has a `teacher_profiles` row" as teacher.
- `components/teach/teacher-profile-form.tsx`: reloads the Clerk user after onboarding, so the client sees new metadata.

## Decisions
- Add `publicMetadata.teacher = true` for every new teacher, admins included (Clerk merges metadata, so `role` is untouched; admins stay admins).
- The button treats `teacher === true || role === "instructor"` as a teacher.
- The button renders nothing when signed out (and keeps its placeholder only while Clerk loads).
- One-off backfill: set `teacher: true` on Clerk users that already have a `teacher_profiles` row (run once with a scratch script, not committed).

## Files
- `components/teach-button.tsx`
- `lib/roles.ts`

## Security
- Metadata is written only on the server with the Clerk secret key. The browser only reads public metadata for display. Access checks stay on the server (teacher profile row / role).

## Acceptance
- Signed out: no pill.
- Signed in learner: "Become a Teacher".
- After finishing teacher onboarding (admin or not): "Create Course", without a manual reload.
- Existing teachers (backfilled): "Create Course".

## Checks
- tsc, lint, build.

## Manual test
1. Sign out → no pill next to the bell.
2. Sign in as a learner → "Become a Teacher".
3. Finish teacher onboarding → lands on My courses, navbar shows "Create Course".
4. Sign in as your admin account (already a teacher) → "Create Course".
