# Gate course and lesson pages behind sign-in

## Goal
Signed-out visitors cannot open a course page or watch a lesson. Opening either sends them to sign in, and after signing in they land back on the page they asked for.

## Skills and docs read
- AGENTS.md §5, §7, §12: Clerk gates private routes in Next.js middleware (here `proxy.ts`), never in client code.
- `node_modules/next/dist/docs/01-app/**/16-proxy.md`: Next 16 names the middleware file `proxy.ts`.
- `@clerk/nextjs` v7 `auth.protect()` types.

## Code inspected
- `proxy.ts`: `clerkMiddleware` already guards `/api/progress(.*)` with a 401 JSON response.
- Routes: `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`, home catalog `app/page.tsx`, `app/sign-in/[[...sign-in]]/page.tsx` (Clerk `<SignIn />`).
- `.env.example`: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` is already set.

## Decisions
- Add `/courses(.*)` and `/lessons(.*)` to a page matcher in `proxy.ts` and call `await auth.protect()`. For a signed-out page request, Clerk redirects to `/sign-in?redirect_url=<original url>`, which is the sign-in prompt. After sign-in, `<SignIn />` follows `redirect_url` back, including any `?t=` start-seconds param.
- The home catalog stays public, so visitors can still browse the course list. Clicking a course card prompts sign-in.
- Keep the existing 401 JSON behavior for `/api/progress`.
- This deliberately changes AGENTS §7 "keep browsing public" for course and lesson pages, at the user's request. Free preview stays a label only.

## Files
- `proxy.ts`

## Security
- Enforced server-side in the proxy before any Sanity fetch runs, so signed-out requests never render content.
- No keys change. The secret key stays server-only.

## Acceptance
- Signed out: `/courses/<slug>` and `/lessons/<slug>` redirect to `/sign-in`, and the original URL is kept as `redirect_url`.
- After sign-in, the user returns to the requested page.
- Signed in: both pages load as before.
- `/` stays public. `/api/progress` still returns 401 JSON when signed out.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (proxy changed).

## Manual test
1. `npm run dev`, sign out.
2. On `/`, click a course card. You should land on `/sign-in`.
3. Sign in. You should be returned to that course page.
4. Sign out, then paste a lesson URL with `?t=60`. Sign in and confirm you return to that lesson.
