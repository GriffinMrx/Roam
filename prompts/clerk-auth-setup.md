# Clerk authentication setup

## Goal

Add Clerk authentication to the Roam Next.js app, linked to the Clerk application the user picked in the Clerk Dashboard (`app_3LSOwhkdGrJE3tQjxvGew6maOYP`). Browsing stays public. This step does not gate any route: features that need a gate (progress, My Learning) will mark their own routes later.

## Skills and docs read

- AGENTS.md (sections 5, 6, 7, 12, 13)
- Clerk setup instructions the user pasted (clerk-setup flow)
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`: in Next.js 16, middleware is called **proxy** (`proxy.ts` at the project root)
- Clerk skills are already installed locally in `.agents/skills/clerk-*`, so `init` runs with `--no-skills`

## Code inspected

- `package.json`: Next 16.4.3, React 19.3, Tailwind 4, no auth dependencies
- `next.config.ts`: `cacheComponents: true`, so any auth-reading UI must sit inside `<Suspense>`
- `app/layout.tsx`: root layout, no providers yet
- `components/site-header.tsx`: has a placeholder profile avatar `<span>` (user icon in a `primary-100` circle). That is where the auth controls go.
- `components/ui/button.tsx`: `buttonStyles()` for the signed-out button
- `.gitignore`: ignores `.env*`, which would also ignore `.env.example`
- No `proxy.ts` / `middleware.ts`, no `.env.example`
- The Next app lives at the repo root, not in a `web/` workspace. I am following the current layout and not restructuring.

## Decisions and assumptions

- Run `npx -y clerk@latest init --app app_3LSOwhkdGrJE3tQjxvGew6maOYP --no-skills` from the repo root. Let it detect Next.js and npm.
- If the CLI is not authenticated for that app, stop and ask the user to run `npx -y clerk@latest auth login` in their own terminal. Do not fall back to an accountless app.
- `ClerkProvider` goes inside `<body>` (current SDK).
- `proxy.ts` uses `clerkMiddleware()` with no protected routes yet (everything stays public).
- Header: the signed-in state replaces the placeholder avatar with `<UserButton />`. The signed-out state shows a `SignInButton` styled with the existing `buttonStyles({ variant: "primary", size: "md" })`. The reference shows only the signed-in avatar, so the signed-out state reuses the existing button and adds no new styling.
- The header auth controls are wrapped in `<Suspense>`, with the current placeholder avatar as the fallback so the layout does not shift.
- Sign-in and sign-up pages that `init` creates are wrapped in `<Suspense>` because of `cacheComponents`.
- Add `.env.example` with the variable names only, and add `!.env.example` to `.gitignore`.
- Never read or print `.env*` files.

## Files expected to touch

- `package.json`, `package-lock.json` (adds `@clerk/nextjs`)
- `proxy.ts` (new)
- `app/layout.tsx` (ClerkProvider)
- `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx` (if init creates them; add Suspense)
- `components/site-header.tsx` (auth controls)
- `.env.example` (new), `.gitignore`
- `.env.local` (written by the CLI, never committed or read)

## Requirements

- `CLERK_SECRET_KEY` is only used on the server, never in client code.
- Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` reaches the browser.
- `auth()` is always awaited.
- The desktop header looks exactly the same when signed in. The avatar is just Clerk's `UserButton` now.

## Security considerations

- Keys stay in `.env.local`, which is gitignored. `.env.example` has no values.
- Any route protection happens in `proxy.ts`, never in client code.
- No user data is stored in Sanity in this step.

## Acceptance criteria

- `@clerk/nextjs` installed, `proxy.ts` present, `ClerkProvider` in the layout
- Signed out: header shows a Sign in button. Signed in: header shows the Clerk user avatar menu.
- Every page stays publicly reachable while signed out
- `clerk doctor`, type check, lint and build all pass

## Checks to run

- `npx -y clerk@latest doctor`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev` and load `/`

## Manual test steps

1. Run `npm run dev` and open http://localhost:3000.
2. Signed out: the header shows **Sign in** where the avatar was.
3. Click **Sign in**, then choose sign up and create an account.
4. After you sign up, the avatar (UserButton) shows in the header. Click it to see Manage account and Sign out.
5. Sign out and check that the home page still loads.
