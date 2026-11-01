# Light mode with a Light / Dark / System switch in Settings

## Goal
Add a light theme next to the existing dark one, with a three-way switch in Settings: **Light / Dark / System**.
- **Default:** Dark stays the default, and dark mode must look exactly as it does today.
- **System:** follows the device's setting and updates live when it changes.

## Decisions (from you)
- **Accent:** purple in light mode too. The neutrals come from the original light design system (`design/vertex-designsystem.png`: slate grays, white cards), not its orange.
- **Options:** Light / Dark / System.

## Skills and docs read
- **AGENTS.md:**
  - §3: UI work. There is no light reference, so the light values come from the original design system and `prompts/dark-purple-theme.md`, which recorded the light tokens.
  - §5: boundaries.
  - §13: checks.
- **`node_modules/next/dist/docs`:** root layout and `cacheComponents`. Reading cookies in the root layout would make every page dynamic, so the theme is not read on the server (see Approach).
- **Clerk types:** appearance `variables` take any CSS color string.

## Code inspected
- **`app/globals.css`:** all tokens are in `@theme`, and Tailwind utilities read them as CSS variables, so the values can be overridden per theme. The neutral scale runs dark-inverted (900 = strongest text, 950 = page background).
- **Hard-coded dark colors:** about 300 across 33 files. The patterns that repeat:
  - `white/N` tints for borders, rings, dividers and panel fills (`border-white/10`, `bg-white/6`, `from-white/6 to-white/2`, `divide-white/6`)
  - secondary text `text-[#d4d4d8]` and `[#e4e4e7]`
  - the silver "glossy" pill (`from-[#e4e4e7] to-[#a1a1aa] text-neutral-950`): active tabs, filters, speed pills, switches, the glossy button
  - panel and cover shadows built from `rgba(0,0,0,0.8–0.9)` and an inset `rgba(255,255,255,0.06)`
  - card surfaces `#111111` and category chips `#1c1c1f`, `#232326` and `#2a2a2e`
- **Already has a light palette:** `components/spotlight-card.tsx` (`THEMES.light`), currently unused.
- **Hard-coded hero colors:**
  - **Heading:** `app/page.tsx` passes a white → gray gradient to the canvas `TechText`.
  - **Swarm:** `SwarmCursor color="#ffffff"`.
- **`app/layout.tsx`:** Clerk appearance variables are hard-coded dark hex values.
- **`app/settings/page.tsx`:** tabs Account / Learning / Your data, plus the `Panel` pattern and the pill radiogroup pattern used by `PreferencesForm`.

## Approach
1. **Theme attribute and choice storage:**
   - The theme is set as `data-theme="dark" | "light"` on `<html>`.
   - The choice (`light` / `dark` / `system`) is stored in `localStorage` (`roam-theme`) on the device. That keeps every page static or partially prerendered.
   - **No flash on load:** a tiny inline script in the root layout's `<head>` sets `data-theme` and `color-scheme` before the first paint. `<html>` gets `suppressHydrationWarning`, the standard pattern.
2. **`lib/theme.ts`** (client):
   - `getThemeChoice()` and `setThemeChoice(choice)`: save the choice and apply it now.
   - `useThemeChoice()`, plus `useResolvedTheme()`, which watches `<html data-theme>` through `useSyncExternalStore`. On the server it returns `"dark"`.
   - **Kept in sync:** System mode follows the device's `prefers-color-scheme` live, and other open tabs follow along through the `storage` event.
3. **Tokens:** `globals.css` keeps every dark value as is and adds one `[data-theme="light"]` block that overrides the variables.
   - **Neutrals:**

     | Token | Light | Role |
     |---|---|---|
     | 950 | #fafafc | page |
     | 900 | #0f172a | text |
     | 700 | #334155 | muted |
     | 500 | #64748b | subtle |
     | 300 | #cbd5e1 | |
     | 200 | #e2e8f0 | border |
     | 100 | #f1f5f9 | |
     | 50 | #ffffff | popovers |
     | surface | #ffffff | |

   - **Primary:** 500 #a855f7 and 600 #9333ea stay the same; the tints become light (400 #c084fc, 300 #d8b4fe, 200 #e9d5ff, 100 #f3e8ff).
   - **Shadows:** the original slate shadows.
   - **New semantic tokens.** Each one's dark value equals the literal it replaces, so dark is pixel-identical:

     | Token | Dark | Light | Replaces |
     |---|---|---|---|
     | `ink` | #ffffff | #0f172a | every `white/N` tint used for borders, rings, dividers and panel fills (`border-ink/10`, `bg-ink/6`, …) |
     | `soft` | #d4d4d8 | #334155 | secondary text `text-[#d4d4d8]` |
     | `soft-strong` | #e4e4e7 | #1e293b | `text-[#e4e4e7]` |
     | `gloss-from` | #e4e4e7 | #334155 | glossy gradient start |
     | `gloss-to` | #a1a1aa | #0f172a | glossy gradient end |
     | `gloss-hover-from` | #f4f4f5 | #475569 | glossy hover start |
     | `gloss-hover-to` | #b4b4bb | #1e293b | glossy hover end |
     | `card` | #111111 | #ffffff | card surfaces |
     | `chip` | #1c1c1f | #ffffff | category chip |
     | `chip-hover` | #232326 | #f1f5f9 | category chip hover |
     | `chip-active` | #2a2a2e | #e2e8f0 | category chip active |

     - **Glossy pills:** dark mode keeps the silver pill with black text. Light mode mirrors it as a slate pill with light text, because `text-neutral-950` resolves to the page color.
     - **Shadow tokens:** `shadow-panel`, `shadow-panel-flat`, `shadow-pill` and `shadow-cover` replace the repeated arbitrary shadows. In light mode they use soft slate shadows instead of heavy black ones.
   - **One-off escape hatch:** a Tailwind `light:` custom variant for the few cases that don't repeat.
4. **Things that stay dark in both themes on purpose**, because they sit on video or images:
   - the video player controls and frame
   - the gradient overlays on covers and thumbnails
   - the bookmark button over covers
   - the white play buttons on thumbnails
   - the black monogram tiles
   - white text on purple or red buttons
5. **Hero:**
   - **Heading:** in light mode, the canvas heading gradient becomes dark (#0f172a → #334155, then #334155 → #64748b), and the swarm color becomes #0f172a. A small client wrapper picks the colors from `useResolvedTheme()`; the components themselves don't change.
   - **"Explore Courses":** it stays a dark pill in both themes, with the white light circling it. In light mode its outer ring gets a dark slate base so that light stays visible.
6. **Spotlight cards:** the palette reads CSS variables (surface, border, glow color), so they follow the theme with no hydration mismatch. The light glow strength uses the existing `THEMES.light` values through the variables.
7. **Clerk** (sign-in and sign-up cards, user menu, Account panel): the appearance `variables` point at the theme's CSS variables, for example `var(--color-surface)`. I'll check this live on `/sign-in` in both themes; if Clerk can't resolve the variables, I'll fall back to switching the appearance on the client.
8. **Settings:** a new **Appearance** tab (icon `settings`) with one panel, "Theme".
   - It uses the same pill radiogroup as "Default playback speed": **Light · Dark · System**.
   - The choice applies immediately; there's no Save button.
   - Helper text: "Saved on this device."

## Files
**New:**
- `lib/theme.ts`
- `components/settings/theme-switch.tsx`
- `components/hero-art.tsx`, a client wrapper that gives TechText and SwarmCursor colors for the current theme

**Edited:**
- `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/settings/page.tsx`
- Color classes swapped for tokens (the same classes otherwise) in:
  - `app/admin/comments/page.tsx`, `app/courses/[slug]/page.tsx`, `app/instructors/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`, `app/my-learning/page.tsx`
  - `components/ui/button.tsx`, `ui/badge.tsx`, `ui/card.tsx`, `ui/progress-bar.tsx`
  - `components/comments/discussion.tsx`, `comments/comment-body.tsx`, `comments/moderation-actions.tsx`
  - `components/course-catalog.tsx`, `course-search.tsx`, `course-progress-ui.tsx`, `footer-bars.tsx`, `hover-border-gradient.tsx`, `lesson-tabs.tsx`
  - `components/settings/preferences-form.tsx`, `settings/data-actions.tsx`, `settings/account-panel.tsx`
  - `components/site-footer.tsx`, `site-header.tsx`, `spotlight-card.tsx`

**Not changed:** `components/video-player.tsx` (always dark) and `app/design-system/page.tsx` (it documents the dark token values).

## Security
- The choice is stored only in the device's `localStorage` and is purely visual.
- No server write, no token, no auth change.
- The inline script is a fixed string with no user input.

## Acceptance
- **Dark mode unchanged:** with no choice saved, the app looks exactly as it does today. I'll compare screenshots of `/`, `/courses`, a lesson and `/settings` before and after.
- **Switching:**
  - Settings → Appearance → Light: every page turns light right away, with no reload.
  - Reloading keeps the choice, with no dark flash on load.
  - Choosing System follows the operating system's setting live.
- **Light mode looks right:** readable text, visible borders, light panels, slate glossy pills with light text, and dark text on the hero heading and swarm. Video, covers and thumbnails look the same as in dark mode.
- **Clerk:** the sign-in card and the user menu follow the theme.
- `tsc`, lint and build pass.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live headless Chrome:
  - screenshots of `/`, `/courses`, a lesson, `/settings?tab=appearance` and `/sign-in` in both themes
  - a dark-mode pixel comparison against the screenshots taken before the change
  - console errors

## Manual test
1. Run `npm run dev` and sign in. Open Settings → **Appearance**.
2. Click **Light**: the page turns light immediately. Open Home, Courses, a course, a lesson and My Learning, and check that everything is readable.
3. Reload: it stays light, with no dark flash.
4. Click **System**, then switch your operating system between light and dark: Roam follows.
5. Click **Dark**: it looks exactly as before.
