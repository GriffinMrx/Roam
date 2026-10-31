# Dark theme with a purple accent (color only)

## Goal

Re-color Roam to the dark look of the reference app in the YouTube video (Grouple, by Web Prodigies, `pyFbM7_Ixno`): near-black backgrounds, dark cards with faint borders, light text, and a purple accent. **Only colors change.** Button, badge, card, and input shapes, spacing, radius, typography, and states stay exactly as the design system defines them.

## Decisions (from the user)

- Accent: **purple**, like the video. Replaces the orange primary scale.
- Mode: **dark only.** Replaces the light tokens, with no toggle and no `prefers-color-scheme` handling.

## Reference

- I can't play YouTube video. I used the video thumbnail (`maxresdefault.jpg`) and sampled its pixels:
  - Page and top bar: `#030303`–`#1a191e`
  - Cards: `#0d0d0f`
  - Active sidebar row: `#18181a`
  - Buttons and pills: `#050507`–`#08080a`
  - Check marks: `#c782ff` (anti-aliased purple)
  - Gradient: `#c200fe`
- The frame at 5:07 was not available. If it differs, the user will share a screenshot.

## Code inspected

- `app/globals.css`: all design tokens (`@theme`). Primary 100–600, neutral 50–900, and semantic tokens `background`, `surface`, `border`, `foreground`, `muted`, `subtle`, `accent`, plus shadows. `color-scheme: light`.
- Components use semantic and scale tokens: `text-muted` ×29, `text-subtle`, `text-primary-*`, `bg-primary-100` (badges, avatar, ghost hover), `bg-neutral-50/100` (hover states), `border-neutral-300` (hover borders), `text-white` (on primary buttons, monograms).
- Hardcoded colors that bypass tokens:
  - `components/spotlight-card.tsx` glow `rgb(249 115 22 / 0.12)`
  - `components/dot-grid.tsx` fallback RGBs
  - `components/ui/card.tsx` and `app/page.tsx` monogram `bg-neutral-900`
  - `app/design-system/page.tsx` swatch hex labels and spec text
  - `components/ui/input.tsx` doc comment
- Clerk components (`SignIn`, `SignUp`, `UserButton` popover) render with Clerk's default light theme.

## Token mapping

Approach: keep the **token names and the class names in components**. Re-point the values so each step still plays the same role on dark. The light scales flip, so "100" is still the soft tint behind accent text and "900" is still the strongest text.

| Token | Role in components | Old | New |
|---|---|---|---|
| neutral-900 | foreground text | #0f172a | #fafafa |
| neutral-700 | muted text | #334155 | #a1a1aa |
| neutral-500 | subtle text | #64748b | #71717a |
| neutral-300 | hover borders | #cbd5e1 | #3f3f46 |
| neutral-200 | borders, dot grid | #e2e8f0 | #27272a |
| neutral-100 | hover fill | #f1f5f9 | #1c1c1f |
| neutral-50 | soft hover fill | #fafafc | #141416 |
| new `neutral-950` | page background | n/a | #09090b |
| background | page | neutral-50 | neutral-950 |
| surface | cards, inputs | white | #111113 |
| white | text on primary | #ffffff | #ffffff (unchanged) |
| primary-600 | hover on primary | #ea580c | #9333ea |
| primary-500 | primary / accent | #f97316 | #a855f7 |
| primary-400 | secondary border, focus ring | #fb923c | #c084fc |
| primary-300 | disabled text, bar gradient | #fdba74 | #6d3fa6 |
| primary-200 | badge ring, disabled border | #fed7aa | #3b1f5c |
| primary-100 | badge and avatar fill, ghost hover | #ffeee5 | #221433 |
| success | completion | #22c55e | #22c55e (unchanged) |
| shadows sm–xl | elevation | slate at 5–12% | black at 30–50% |

- `color-scheme: dark` so native controls and scrollbars go dark.

## Other color-only fixes

- Monogram default `bg-neutral-900` → `bg-black` in `card.tsx` and `app/page.tsx`. With the flipped scale it would otherwise turn white behind white text. The Docker and TS brand colors stay as they are.
- Spotlight glow → `rgb(168 85 247 / 0.12)` (primary 500 at 12%).
- Dot-grid fallback RGBs → the new neutral-200 and primary-500.
- Design-system page: update the swatch labels and hex values, add Neutral 950 and Surface, and update the input spec text.
- Clerk: `ClerkProvider appearance.variables` set to the same tokens (colorBackground, colorText, colorPrimary, colorInput, colorNeutral). This uses only Clerk variables: no new package, no layout change.

## Files expected to touch

- `app/globals.css`
- `components/spotlight-card.tsx`, `components/dot-grid.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx` (comment only)
- `app/page.tsx` (monogram class), `app/design-system/page.tsx` (swatches and spec text)
- `app/layout.tsx` (Clerk appearance variables)

## Out of scope

- Any change to size, spacing, radius, font, layout, or component structure
- A theme toggle or light mode

## Security considerations

None. These are style changes only, with no data, auth, or env changes.

## Known trade-off

White text on `#a855f7` has a contrast of about 4.0:1. That passes WCAG AA for large or bold text, but is just under 4.5:1 for 14px body text. It matches the video's purple. If you want strict AA on button labels, use primary-500 `#9333ea` with hover `#7e22ce` instead. The catch is that purple text on the dark background then looks dimmer.

## Acceptance criteria

- Every page renders dark: home, design system, sign-in, sign-up, and the header with the user menu.
- Buttons (primary, secondary, tertiary, text), badges, inputs, and cards keep identical dimensions and states. Only their colors differ.
- No orange remains anywhere. A grep for `f97316`, `fb923c`, `249 115 22` finds nothing in app code.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Grep for leftover light and orange hex values
- Load `/`, `/design-system`, and `/sign-in` on the dev server

## Manual test steps

1. Open http://localhost:3000. The background is near-black, the hero is light text on dark, and the "Explore Courses" button is purple.
2. Hover the course cards. The glow is purple, the borders are faint, and the monograms are still readable.
3. Move the pointer over the hero dot grid. The dots blend toward purple.
4. Open http://localhost:3000/design-system and compare each button, badge, and input state with before. The sizes match, and only the colors change.
5. Click **Sign in**. The Clerk card is dark with a purple primary button.

## Addendum: leftover orange (follow-up request)

- **Hero dots on click:** no code change needed. Every served CSS and JS chunk has `--color-primary-500: #a855f7` and no orange. A CDP-driven headless Chrome hover and click on the hero shows purple dots (`#7d46b3` / `#8147ba` blends). The user's tab was running a bundle from before the theme change. The dot grid now re-reads colors when the stylesheet changes (spotlight prompt). The fix is a hard refresh.
- **Clerk "Development mode" label** (sign-in card footer and profile menu): Clerk draws it, and its striped backdrop, with its warning color, which defaults to orange. There is no dedicated element key in the appearance types. Set `appearance.variables.colorWarning` to primary 500 `#a855f7`.
  - Side effect: Clerk's other warning text, such as weak password hints, also turns purple.
  - The label only appears on development instances and is gone in production.
- Files: `app/layout.tsx`, one variable added.
- Checks: type check, lint, and a headless screenshot of `/sign-in`.

## Addendum 2: darker values measured from a full video frame

The user supplied a full-resolution frame of the reference app ("Explore Groups" screen). Pixel histograms from it:

| Area | Measured |
|---|---|
| Page background | `#000000` (≈35k of 35k samples) |
| Top bar | `#030305` |
| Cards, "Create Group" button | `#070709` / `#08080a` |
| Search field | `#171513`–`#181614` |
| Category pills | `#262626` |
| Borders | `#0b0b0b`–`#0d0d0d`, barely visible |

The first mapping came from the JPEG thumbnail and was too light. New values (token roles unchanged, colors only):

| Token | Was | Now |
|---|---|---|
| neutral-950 / background | #09090b | #000000 |
| surface | #111113 | #070709 |
| neutral-50 (soft hover) | #141416 | #0c0c0e |
| neutral-100 (hover fill, inputs) | #1c1c1f | #161618 |
| neutral-200 (border, dot base) | #27272a | #1c1c1f |
| neutral-300 (hover border) | #3f3f46 | #2a2a2d |
| text neutral-900 / 700 / 500 | unchanged | unchanged |
| primary scale | unchanged | unchanged |

- The home course cards (reactbits Spotlight Card) default to a `#111111` surface, which would read lighter than the video's cards on pure black. Set `--spotlight-card-surface` to the surface token through the component's documented CSS variable, so the cards match the video at `#070709`. Light, edge glow, radius, and padding stay exactly as reactbits defines them.
- Clerk: `colorBackground` becomes `#070709` and `colorInput` becomes `#0c0c0e`.
- Design-system swatches are updated to the new hex values.
- Checks: type check, lint, build, and a headless screenshot of `/` and `/sign-in` compared against the frame.
