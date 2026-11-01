# Split onboarding: survey after sign-up, teacher profile only from "Become a Teacher"

## Goal
- **New accounts** always land on the full onboarding: "I want to learn / I want to teach" → "Tell us about yourself" (persona, where they heard about Roam, goals, topics, level, time) → recommendations (learn) or teacher profile (teach).
- **"Become a Teacher"** (navbar) opens only the teacher profile step, with no survey questions.

## Code inspected
- `app/onboarding/page.tsx`: one page for both entries; `?role=teacher` preselects "teach" but still runs role → about → teacher.
- `components/teach/onboarding-flow.tsx`: the steps are `role`, `about`, `recommend` and `teacher`. The about step is skipped when earlier answers exist. "Skip for now" is on the role step.
- `app/sign-up/[[...sign-up]]/page.tsx`: `forceRedirectUrl="/onboarding"`. `app/sign-in/[[...sign-in]]/page.tsx` has no sign-up redirect, so a new account made with "Continue with Google" on the sign-in page skips onboarding.
- `app/api/onboarding/route.ts` and `lib/user-profile.ts`: save the answers in `user_profiles`.
- `lib/roles.ts`: Clerk public metadata (written on the server only).

## Decisions
- **Two modes, one page:**
  - `/onboarding` runs the full flow.
  - `/onboarding?role=teacher` runs only the teacher profile step (one progress bar).
- **Redirects on the onboarding page (server side):**
  - Teacher mode and already a teacher → My courses (unchanged).
  - Teacher mode without survey answers → the full flow with "teach" preselected, so the survey is never skipped.
  - Full flow with answers already saved → home.
- **Strict after sign-up:**
  - `<SignIn signUpForceRedirectUrl="/onboarding">` covers Google accounts created from the sign-in page.
  - Saving the survey sets Clerk `publicMetadata.onboarded = true` on the server.
  - A small client gate in the root layout sends signed-in users without `onboarded` to `/onboarding`. It skips `/onboarding`, `/sign-in`, `/sign-up` and `/api`. This is navigation only; no data access depends on it.
  - "Skip for now" is removed, so the survey is required.
  - One-off backfill: users that already have a `user_profiles` row get `onboarded: true`. Existing accounts with no answers (for example your admin account, unless it answered) are asked once.
- **Smaller code:** the flow drops the "skip the about step when answers exist" logic, which the redirects now replace.

## Files
- `app/onboarding/page.tsx`
- `components/teach/onboarding-flow.tsx`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/api/onboarding/route.ts` and `lib/roles.ts` (set `onboarded`)
- new `components/onboarding-gate.tsx`, mounted in `app/layout.tsx`

## Security
- Metadata is written only on the server with the Clerk secret key. The browser only reads public metadata to decide where to navigate. The proxy and server checks stay as they are.

## Acceptance
- A new sign-up (email or Google, from either page) lands on `/onboarding` and must answer before using the site.
- Choosing "teach" in the full flow: role → about → teacher profile → My courses.
- Choosing "learn": role → about → recommendations.
- A learner who already answered clicks "Become a Teacher" and sees only the teacher profile step.
- Visiting `/onboarding` again after answering goes home.

## Checks
- tsc, lint, build.

## Manual test
1. Sign up with a new account and land on "How will you use Roam?". Try opening `/courses` and you're sent back.
2. Pick "I want to learn", answer the questions, and see the recommendations.
3. Click "Become a Teacher" in the navbar. Only "Your teacher profile" shows. Save it and land on My courses, where the pill says "Create Course".
4. Sign up another account, pick "I want to teach", answer the questions, and the teacher profile follows.
