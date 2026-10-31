# Glassmorphism navbar

## Goal

Make the site header a translucent, blurred "glass" bar that stays at the top while content scrolls underneath, as in the user's screenshot of the reference app (Grouple, from the Web Prodigies video). This is a color and surface change only: header layout, sizes, and contents stay the same.

## Reference measurements (pixel averages from the user's screenshot)

| Area | Measured |
|---|---|
| Bar over empty black page | `#040306` (near black, faint violet tint) |
| Bar over the card columns scrolling beneath | `#131E28` / `#1F1D1E` / `#2B2526`: content shows through |
| Card body just below the bar, unblurred | `#13181E`, about the same brightness, so the tint is light |
| Card edge inside the bar vs below it | inside: a smooth ramp over about 30px. Below: a sharp step. This means a strong backdrop blur (about 24px). |
| Bar bottom edge | hairline, about `#050505` |

## Code inspected

- `components/site-header.tsx`: `<header className="flex h-24 items-center justify-between border-b border-border px-6 sm:px-10">`. Not sticky.
- `app/page.tsx` and `app/courses/[slug]/page.tsx`: the page wrapper is `relative flex … flex-col overflow-hidden bg-background`, and `<main>` is `relative z-10`.
- `overflow-hidden` makes the wrapper a scroll container, so `position: sticky` on the header would stick to the wrapper instead of the viewport. `overflow-clip` clips the same way (it still contains the decorative footer bars and the dot grid) without creating a scroll container.

## Decisions

- Header classes:
  - Add: `sticky top-0 z-50 bg-background/30 backdrop-blur-xl backdrop-saturate-150` (24px blur; a 30% black tint). The plan said 60%, but at 60% the bar measured `#030304` over the cards, far darker than the reference, where the bar over content is about as bright as the content itself. 30% keeps the bar near black over empty space and lets blurred content show through.
  - Change the border to `border-white/5`, a hairline like the reference.
- Page wrappers change from `overflow-hidden` to `overflow-clip` on the home and course pages, so the sticky header works and the decorations stay clipped.
- No other changes: height `h-24`, padding, nav, bell, and auth controls stay as they are. The hero's dot grid and the Tech Text heading sit below the bar at rest and slide under it when scrolling.
- No new packages. Tailwind's `backdrop-blur-xl` and `backdrop-saturate-150` are built in.

## Files expected to touch

- `components/site-header.tsx`
- `app/page.tsx`, `app/courses/[slug]/page.tsx` (wrapper overflow only)

## Security considerations

None. This is styling only.

## Acceptance criteria

- Scrolling the home or course page keeps the header pinned at the top.
- Content passing under the header is visible but strongly blurred and slightly darkened.
- Over empty background the bar looks near black, with a hairline bottom edge.
- No horizontal scrollbar appears, and the footer bars and dot grid are still clipped.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome over CDP: scroll the home page so the course cards pass under the header, screenshot it, and measure blur and tint the same way as the reference. Confirm `getBoundingClientRect().top === 0` for the header after scrolling. Check `scrollWidth === clientWidth` at 1280 and 390.

## Manual test steps

1. Open http://localhost:3000 and scroll down. The header stays at the top.
2. As the course cards pass under the header, they show through blurred, like frosted glass.
3. Open a course page and scroll. Same effect.
4. At phone width, there's no sideways scrolling.
