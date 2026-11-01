# Category chips: edge fades, auto-slide, icons (+ swarm fix)

## Goal
1. **Edge fades:** chips fade into the background at the left and right edges, as in the reference (`images/4.png`). There, "Tech" on the left and the crown chip on the right dissolve into the dark.
2. **Auto-slide:** the chip row scrolls on its own in an endless loop.
3. **Icons:** wire in the icons you uploaded.
4. **Swarm Cursor fix** (already done, it was a bug): the swarm didn't show in `npm run dev`.

## Swarm fix (done)
- **Cause:**
  - The React Bits source's effect cleanup calls `WEBGL_lose_context.loseContext()`.
  - React Strict Mode (on in dev) runs the effect, cleans it up and runs it again on the same `<canvas>`, so the second run only gets the dead context.
  - Chrome shows a white canvas with a sad-face icon, and no particles.
- **Fix:** drop that one call. Buffers and the program are still freed.
- **Verified** over Chrome DevTools with real WebGL2: before the fix, the canvas was white with the lost-context icon; after it, particles trail the cursor behind the heading.

## Code inspected
- `components/course-search.tsx`: `HomeCategoryChips` (a static row with a CSS mask fade, centered, `MaybeIcon name={slug}`).
- `components/ui/icon.tsx`: the glyph registry (primary paths at full opacity, secondary at 40%).
- `app/globals.css`: the Tailwind v4 `@theme`, where an animation token goes.
- **New icons** in `assets/icons/`:
  - `refresh`, `ai-book`, `cloud-database`, `layer` and `add-lock`, all filled, 24×24
  - `code-development`, also filled, 24×24
  - `natural-language-generator`, drawn on 22×22, so it gets re-centered onto 24×24 by shifting it 1px

## Decisions
- **Icon mapping** (chip → icon):
  | Chip | Icon |
  |---|---|
  | All | `refresh` (the circular arrows in the reference) |
  | AI Engineering | `ai-book` |
  | Backend & Infrastructure | `cloud-database` |
  | Data | `layer` |
  | Languages | `natural-language-generator` |
  | Security | `add-lock` |
  | Web Development | `code-development` |
  - The mapping is by category slug. A future category with no icon keeps an empty slot.
- **Marquee:**
  - the chip list is rendered twice, side by side, and slides left with a CSS `translateX(-50%)` loop (about 40s, linear), so it repeats seamlessly
  - the second copy is `aria-hidden`, and its buttons are taken out of the tab order
- **Pause:** it stops on hover and when a chip has keyboard focus, so you can click it.
- **Reduced motion:** with `prefers-reduced-motion`, there's no animation; the row becomes a normal sideways scroll.
- **Edge fades:**
  - a mask fades both sides to transparent over the dark hero: about 18% of the width on each side, as in the reference
  - the row is a little wider than the search (`max-w-4xl`), so several chips are fully visible in the middle
- **Click** still filters the course grid (no change).

## Files
`components/course-search.tsx`, `components/ui/icon.tsx`, `app/globals.css`, `components/swarm-cursor.tsx` (fix already in).

## Security
UI only.

## Acceptance
- The chips glide left on their own and loop with no visible jump. Chips fade out at both edges as in the reference.
- Hovering the row pauses it; clicking a chip filters the grid; Tab focuses the chips and pauses the row.
- Every chip shows its icon, with "All" showing the refresh arrows.
- With reduced motion on, there's no sliding.
- The swarm shows in `npm run dev` and in production.

## Checks
`npx tsc --noEmit`, `npm run lint`, `npm run build`, plus a DevTools screenshot of the hero.

## Manual test
1. Run `npm run dev` and open `/`. Move the mouse over the heading: the swarm follows.
2. Watch the chips slide and fade at both edges. Hover to pause, then click "Data".
3. Turn on Reduce motion in your OS: the chips stop, and you can scroll them by hand.
