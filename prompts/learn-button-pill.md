# Learn button: glossy pill in soft gray

## Goal
Restyle the course page's Start Learning, Continue Learning and Review Course button to match the reference "Start a free trial" button: a pill shape, a vertical gradient, a soft inner top highlight and a drop shadow. Use gray instead of purple, close to the header Sign in pill but less white.

## Code inspected
- `components/course-progress-ui.tsx`: `LearnButton` uses `buttonStyles()` (primary purple) plus `px-6 shadow-md`. It is used in the course hero and in the `ProgressSummary` panel.
- `components/site-header.tsx`: the Sign in pill (`from-white to-[#d4d4d8]`, inset white highlight, drop shadow) is the style to echo.
- The theme's `neutral-*` scale is inverted for dark mode, so literal grays are used, as for Sign in.

## Decisions
- Same pill recipe as Sign in, toned down:
  - `h-12 rounded-full px-6`
  - gradient `from-[#e4e4e7] to-[#a1a1aa]`: light gray at the top, mid gray at the bottom, with no pure white
  - `text-neutral-950`, 1px `border-[#a1a1aa]`
  - inset top highlight `rgba(255,255,255,0.6)`, drop shadow `0 4px 12px rgba(0,0,0,0.35)`
- Hover: the gradient lightens slightly (`hover:from-[#f4f4f5] hover:to-[#b4b4bb]`).
- The label and arrow icon are unchanged. Both usages pick up the style because it lives in `LearnButton`.

## Files
- `components/course-progress-ui.tsx`

## Security
None. Presentational only.

## Acceptance
- On the course page, the hero button and the Your Progress panel button are soft gray gradient pills with dark text. They are visibly less bright than the Sign in pill.
- The links and labels behave as before.

## Checks
- `npx tsc --noEmit`, `npm run lint`.

## Manual test
1. `npm run dev`, sign in, open a course page.
2. Compare the hero button with the reference and the Sign in pill, and hover it.
3. Scroll to Your Progress and check that the button matches.
