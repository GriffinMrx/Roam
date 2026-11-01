# Fix the chip loop, remove the hero badge and the hero divider

## Goal
1. The category chips slide **left to right** in an endless loop, on their own, all the time.
2. Remove the "Intelligent Learning" badge above the heading (`images/5.png`).
3. Remove the line under the hero that separates it from "All Courses".

## Why the chips stopped (diagnosis)
- Windows "Show animations" is on, so reduced motion isn't the cause.
- **Click froze it:** the row paused while any chip had focus (`group-focus-within`). Clicking a chip focuses it, so after one click the row stayed frozen until you clicked somewhere else.
- **Hover paused it:** a pointer resting on the row also stopped it.
- **Stale CSS in dev:** a dev server that was running before the animation token was added serves CSS without `animate-marquee`. A restart fixes it; verified that the production build has it.

## Decisions
- **Direction:** the loop runs from `translateX(-50%)` to `0`, so chips travel left to right. Same speed (40s per loop) and the same two-copy seamless track.
- **Never pauses on hover or click.** It only pauses while a chip has *keyboard* focus (`:focus-visible`), so keyboard users can read and choose. Mouse users never see it stop.
- **Reduced motion** (the OS accessibility setting) still turns it into a manual scroll. That setting is off on this machine, so it doesn't affect you.
- **Chip shape** stays as built (rounded 12px pills, as in the reference), unless you meant something else by "shape".
- Remove the `MovingBorderBadge` from the hero. `components/moving-border.tsx` stays if anything else uses it; otherwise it's deleted with its import.
- Remove `border-b border-border` from the hero `<section>`.

## Files
`components/course-search.tsx`, `app/globals.css`, `app/page.tsx`, possibly `components/moving-border.tsx`.

## Acceptance
- On page load, the chips glide left to right without stopping; hovering or clicking a chip doesn't stop them; clicking still filters.
- No badge above the heading. No line between the hero and All Courses.

## Checks
`npx tsc --noEmit`, `npm run lint`, `npm run build`, plus a live DevTools check in the **dev** server (motion direction, still moving after hover and click).

## Manual test
1. Stop and restart `npm run dev`, then hard-refresh `/`.
2. The chips glide left to right. Hover them and click "Data": they keep moving and the grid filters.
3. Check there's no badge and no divider line.
