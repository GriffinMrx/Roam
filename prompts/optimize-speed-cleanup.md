# Optimize for speed and remove dead code (no behavior change)

## Goal
Make the app lighter and faster and remove dead code. Every feature, screen, text and behavior stays exactly the same. Each change is small and checked on its own.

## Skills and docs read
- **AGENTS.md:** §5 (boundaries), §12 (tokens stay on the server) and §13 (checks).
- **`node_modules/next/dist/docs`:** caching with `cacheComponents` / `'use cache'`, and `next/image`.
- **motion docs:** the shipped `.d.ts` files for `LazyMotion`, `m` and `domAnimation`.

## Baseline (clean `next build`, then `next start`)
**Build:** about 29s, no errors.

**JS shipped per page** (all script files on the page, gzip):

| Page | JS files | JS raw | JS gzip | Server response (warm) |
|---|---|---|---|---|
| `/` | 14 | 981 KB | 309 KB | ~20 ms |
| `/courses` | 13 | 829 KB | 256 KB | ~30 ms |
| `/lessons/handstand-mastery-wall-walks` | 13 | 851 KB | 262 KB | ~18 ms |
| `/instructors/aisha-bello` | 11 | 767 KB | 233 KB | ~30 ms |
| `/design-system` | 11 | 746 KB | 226 KB | ~10 ms |

- About 220 KB gzip of every page is the shared base: React, Next and Clerk. That base is required and can't be removed.
- `/courses/[slug]` redirects to sign-in when signed out (by design), so it isn't measured.
- The home page carries an extra ~85 KB gzip. A large part of it is the motion library, which is used only by the "Explore Courses" button (`HoverBorderGradient`).

## What I inspected
All of `app/`, `components/`, `lib/`, `sanity/`, `proxy.ts`, `next.config.ts` and `package.json`. I also ran a script that finds unreferenced files and exports, and checked every dependency's imports.

**Already in good shape (no change):**
- **Sanity reads:** one shared `'use cache'` boundary with live tag invalidation.
- **Proxy:** the free-lesson check is cached in memory.
- **Database:** one pg pool per process.
- **Images:** every `next/image` has correct `sizes`.
- **Animation loops:**
  - The Swarm and Tech Text loops pause when off-screen or when the tab is hidden.
  - The spotlight cards stop their loop when idle.
- **Clean code:** no debug logs and no commented-out code.

**Dead code is minimal:**
- Every UI export is used, at least by `/design-system`, which is a page.
- The only unused files are the five Create Next App starter SVGs in `public/`.

## Changes (each one small, checked separately)
1. **Lighter "Explore Courses" button:** `components/hover-border-gradient.tsx` swaps `motion.div` for `m.div` inside `<LazyMotion features={domAnimation} strict>`.
   - This is motion's documented way to ship only the animation features in use, instead of the full ~34 KB library.
   - The same component animates the same values with the same timing, so the look is identical.
2. **Fewer wasted wake-ups for off-screen cards:** in `components/spotlight-card.tsx`, a pointer move or scroll no longer wakes a card that is off-screen and not glowing.
   - Today, every card on `/courses` (16+) measures itself on every mouse move, even off-screen.
   - A card that is still fading out keeps waking until it finishes.
   - Visible cards behave exactly as before: an off-screen card's glow can't be seen anyway, and it wakes again the moment it scrolls into view.
3. **Remove unused files:** `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg` and `window.svg`. These are Create Next App leftovers, and nothing references them.
4. **Remove a leftover comment:** the `/* config options here */` placeholder in `next.config.ts`.

## Not changing (and why)
- **`@neon/env` dependency:** no code imports it, but it provides the `neon-env` CLI (`neon-env run`) that you may use by hand with `neon.ts`. Removing it could break that workflow. I'll keep it and flag it.
- **Swarm Cursor and Tech Text** (about 2,000 lines of home-only client code): lazy-loading them would make the hero heading and swarm appear late or flash in. That's a visible change.
- **Discussion:** it is mounted in a hidden tab because it fetches the comment count shown on the tab. Lazy-loading it would delay that count.
- **Video player:** it updates the playhead state 4×/s while playing, which drives the time display and seek bar. That's cheap, and slowing it would make the time display less smooth.
- **Unused types and generated code:** exported types used only in their own file, `hasIcon`, and the generated `sanity.types.ts`. The "no public API renames or removals" rule applies, and they cost nothing at runtime.
- **Clerk, SanityLive and React:** required by auth and live content.

## Files
- `components/hover-border-gradient.tsx`
- `components/spotlight-card.tsx`
- `next.config.ts`
- `public/*.svg` (deleted)

## Security
No change to auth, tokens, routes or data. These are client-side rendering optimizations only.

## Acceptance
- "Explore Courses" looks and animates exactly as before:
  - the light circles the border
  - on hover, the whole border lights up
- Spotlight cards on `/`, `/courses`, the course page and the instructor page glow and follow the cursor as before, including the 80px proximity glow and the press flare.
- The home JS is smaller than the baseline. No other page grows.
- `tsc`, lint and the production build pass.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build` after each change.
- Re-run the bundle measurement script on `next start` and compare it with the baseline above.
- Live Chrome check:
  - the button animation runs
  - cards glow on hover
  - no console errors

## Manual test
1. Run `npm run dev` and open `/`. Watch the "Explore Courses" border light circle, then hover it: the whole border lights up.
2. Move the mouse over and near the course cards: the glow follows, as before. Click and hold a card: it flares.
3. Open `/courses`, scroll down and hover cards further down: they glow normally.
