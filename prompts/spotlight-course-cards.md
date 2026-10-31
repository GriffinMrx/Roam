# Course cards as the reactbits Spotlight Card, plus the hero dot color

## Goal

1. Make the home page course cards look and behave exactly like https://reactbits.dev/components/spotlight-card (current version).
2. Make sure the hero dot grid is purple, not orange.

## Sources read

- reactbits source, fetched from GitHub (`DavidHDev/react-bits`, `src/ts-tailwind/Components/SpotlightCard/SpotlightCard.tsx`), and the demo `src/demo/Components/SpotlightCardDemo.jsx` for the default props.
- `components/spotlight-card.tsx` (our older, simplified copy: a hover-only radial overlay), `components/ui/card.tsx` (`Card`, `CourseCard`), `app/page.tsx`, `components/dot-grid.tsx`, `lib/cn.ts` (plain join, with no tailwind-merge).
- Compiled dev CSS: `--color-primary-500` is `#a855f7`. An old chunk with `#f97316` is still in `.next`.

## Findings

- **Dots:** `DotGrid` reads `--color-neutral-200` and `--color-primary-500` once, when it mounts. After the theme change, hot reload swapped the CSS but didn't remount the canvas, so the open tab kept the orange it read earlier. The code is already purple, and a full reload fixes it. To stop this from happening again on the next token change, the grid will re-read its colors whenever the stylesheet changes. It watches `<head>` for added or removed stylesheet nodes, which is cheap and only matters in dev.
- **Reactbits card (dark theme, demo defaults):**
  - Surface `#111111`, `rounded-3xl` (24px), `p-8`, a 1px border `rgba(255,255,255,0.08)` drawn as a masked ring, and shadow `0 24px 48px -24px rgba(0,0,0,0.6)`.
  - The light is white, `intensity 0.15`, `spotlightSize 240`, `softness 0.7`, `borderGlow 0.6`, `proximity 80` (light reaches neighbouring cards within 80px), `smoothing 0.3`, `flare` on press, no grain, no ambient.
  - The animation runs on requestAnimationFrame, respects reduced motion, and follows keyboard focus.

## Decisions

- Replace `components/spotlight-card.tsx` with the reactbits TS + Tailwind source, unchanged in behavior and defaults. The only adaptations are a named export (`export function SpotlightCard`) to match the project's style, and `cn` for classes. All props stay: `spotlightColor`, `intensity`, `spotlightSize`, `softness`, `shape`, `borderGlow`, `proximity`, `smoothing`, `ambient`, `flare`, `grain`, `theme`.
- The light is **white, like the demo**, because you asked for an exact match. A purple light is one prop away: `spotlightColor="#a855f7"`.
- `Card` gets a `framed` prop (default `true`). `CourseCard` passes it through. On the home page, `CourseCard framed={false}` sits inside `SpotlightCard`, so the frame (surface, radius, padding, border, shadow) comes only from the reactbits card. The content inside (monogram, title, description, meta row) is unchanged. `framed={false}` keeps the content layout (`flex flex-col`) and drops the frame classes. Nothing else uses `framed`, so the design-system page and other cards don't change.
- Cards in the grid stretch to equal height, as they do today.

## Files expected to touch

- `components/spotlight-card.tsx` (replaced with the reactbits source)
- `components/ui/card.tsx` (`framed` prop on `Card` and `CourseCard`)
- `app/page.tsx` (use `framed={false}`, with the card props at their defaults)
- `components/dot-grid.tsx` (re-read colors when the stylesheet changes)

## Security considerations

None. This is client-side visuals only.

## Acceptance criteria

- The home course cards match the reactbits demo:
  - Dark `#111111` surface, 24px corners, 32px padding, faint white edge, and deep shadow.
  - A soft white light follows the pointer and the nearby edge glows.
  - Light spills onto the neighbouring card when the pointer is between cards, and swells when you press.
- The card content is unchanged.
- Hero dots blend to purple under the pointer after a normal reload, and stay purple after a later CSS edit without a reload.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- A headless screenshot of `/` to confirm the card frame

## Manual test steps

1. Hard-refresh http://localhost:3000 (Ctrl+Shift+R).
2. Move the pointer over the hero. The dots near it turn purple.
3. Move the pointer over a course card. A soft white light follows it and the card's edge lights up near the pointer.
4. Move between two cards. The light reaches both.
5. Press and hold on a card. The light swells.
6. Press Tab to reach a card link, if there is one. The light centers on the focused element.
