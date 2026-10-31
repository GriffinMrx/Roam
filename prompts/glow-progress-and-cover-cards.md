# Glowing progress bar and cover-style course cards

## Goal
1. **Progress bar:** replace the flat purple fill with a modern **white-to-gray (silver) gradient** that has a soft white glow and a slow shimmer sweep. This was the user's choice.
2. **Course cards:** restyle them to the user's reference. A large cover image spans the top, and a **raised bottom panel in its own lighter shade** holds the title, description and meta. A soft top highlight and a deeper shadow give it a 3D feel. This applies everywhere course cards appear.

## Code inspected
- `components/ui/progress-bar.tsx`:
  - The track is `bg-neutral-100` with `overflow-hidden`, which would clip a glow.
  - The fill is a flat `bg-primary-500`.
  - It is used on the course progress summary, the lesson sidebar, and My Learning (hero and cards).
- `components/ui/card.tsx` `CourseCard`: the `stacked` layout has a 64px cover tile on top, the title and description, then a meta row (chart, clock, folder).
- `components/spotlight-card.tsx`:
  - A vendored react-bits card. Its `CARD` base includes `p-8 rounded-3xl`.
  - The shadow comes from the `--spotlight-card-shadow` CSS var.
  - The spotlight light and grain layers sit behind the content (`-z-10`).
- Course card call sites:
  - `components/course-search.tsx` (home grid)
  - `app/my-learning/page.tsx`: the empty-state popular grid and the custom `InProgressCard`
  - The cover image is fetched at 128×128 everywhere.
- `lib/cn.ts` only joins classes and does not merge conflicts, so padding can't be overridden with a class.
- `app/globals.css` `@theme` has no keyframes yet.

## Decisions
- **Progress bar** (`progress-bar.tsx`, plus a keyframe in `globals.css`):
  - Track: `bg-neutral-100` (a dark graphite) with an inset shadow, so the bar looks recessed. The track no longer clips, so the glow can spill out.
  - Fill: `bg-linear-to-r from-[#71717a] via-[#d4d4d8] to-white`, rounded, with a white glow `shadow-[0_0_12px_rgba(255,255,255,0.45)]`. The fill keeps `overflow-hidden` for the shimmer.
  - Shimmer: a narrow white highlight sweeps across the fill every ~2.5s (`@theme --animate-shimmer` plus keyframes). It is wrapped in `motion-safe:` so reduced-motion users get a static bar. At 0%, nothing renders.
  - The API is unchanged, so all usages update automatically.
- **Cover course card** (`card.tsx`): add a `layout="cover"` variant to `CourseCard`, with a new `cover?: ReactNode` prop for the big image.
  - Top: a full-width `aspect-[16/9]` image with a subtle bottom fade into the panel. The monogram is the fallback when there is no cover.
  - Bottom panel: a lighter graphite gradient `from-white/[0.07] to-white/[0.02]`, a top border highlight `border-t border-white/10`, and an inset top highlight. The title is `text-heading-3` with a 2-line clamped description, as in the reference. The meta row (level, duration, modules) is kept below.
  - The whole card stays one link, as now.
- **SpotlightCard:**
  - Add a small `flush` prop that drops the base `p-8`, so the cover can bleed to the edges. Behavior is otherwise unchanged.
  - Cover cards pass a deeper shadow through the existing `--spotlight-card-shadow` var: `0 30px 60px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)`.
- **Call sites:**
  - The home grid and My Learning popular grid use `layout="cover"`, with covers fetched at 800×450 crop.
  - My Learning `InProgressCard` gets the same structure: cover on top, then a raised panel with the title, level, "Module X of Y", % and the glowing progress bar, and the Continue pill.
  - The completed rows and the lesson sidebar keep their compact layouts. They are rows, not cards.
- `layout="row"` and `layout="stacked"` stay available, so the design-system page is unaffected.

## Files
- `components/ui/progress-bar.tsx`, `app/globals.css`
- `components/ui/card.tsx`, `components/spotlight-card.tsx`
- `components/course-search.tsx`, `app/page.tsx` (cover URL size), `app/my-learning/page.tsx`

## Security
None. Presentational only.

## Acceptance
- Every progress bar shows a silver gradient fill with a soft white glow and a gentle shimmer. It is static with reduced motion.
- Course cards on home and My Learning match the reference: a big cover on top, then a lighter raised panel with the title and description, with depth from the highlight and shadow. The spotlight hover effect still works.
- Layouts stay responsive. On mobile the cards are one column, full width.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. `npm run dev`, open `/`, and compare the course cards with the reference. Hover a card to see the spotlight.
2. Open a course page and look at the Your Progress bar. Then open a lesson and check the sidebar bar.
3. Open `/my-learning` and check the hero bar and the In Progress cards.
4. With OS reduced motion on, check that the shimmer stops.
