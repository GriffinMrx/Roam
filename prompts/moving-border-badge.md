# "Intelligent Learning" badge with the Aceternity Moving Border

## Goal

Give the hero eyebrow badge, "Intelligent Learning", the style of https://ui.aceternity.com/components/moving-border, a glow travelling around the border, using the app's colors instead of Aceternity's sky blue and slate.

## Sources read

- Aceternity registry `https://ui.aceternity.com/registry/moving-border.json`: `components/ui/moving-border.tsx`, dependency `motion` (already installed for the hero button).
  - `MovingBorder` measures an SVG `<rect>` path and moves a child along it with `useAnimationFrame`, `getPointAtLength`, and a `useMotionTemplate` transform.
  - `Button` wraps it: an outer `p-[1px] overflow-hidden` container, the moving glow `h-20 w-20 bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-[0.8]`, and an inner panel `border border-slate-800 bg-slate-900/[0.8] backdrop-blur-xl`. The glow shows only through the 1px gap.
- `app/page.tsx` hero badge: `<p className="rounded-sm border border-primary-200 bg-primary-100 px-4 py-2 text-small font-semibold tracking-widest text-primary-500 uppercase">Intelligent Learning</p>`.

## Decisions

- Add `components/moving-border.tsx` with Aceternity's `MovingBorder` unchanged in behavior. Adaptations:
  - `cn` from `@/lib/cn`.
  - Typed refs (`useRef<SVGRectElement>(null)`) and no `any`, so lint passes.
  - `rx` and `ry` accept any SVG length, so the path can follow a small corner radius.
- Add a `MovingBorderBadge` wrapper (`radius` prop in px, default 8, shared by the container and the SVG path), modelled on Aceternity's `Button` but sized for a badge rather than its fixed `h-16 w-40` button:
  - The outer element (`as`, default `div`) is `relative inline-flex overflow-hidden p-px`. The glow is `size-12` (scaled from Aceternity's 80px glow on a 64px button to this badge, about 34px tall).
  - **Colors from the app tokens:**
    - Glow: `bg-[radial-gradient(var(--color-primary-500)_40%,transparent_60%)] opacity-80`, the purple accent in place of `#0ea5e9`.
    - Inner panel: `border border-primary-200 bg-primary-100/80 backdrop-blur-xl`, the badge's existing purple fill and border in place of slate.
    - Text: `text-primary-500`.
  - Radius: `0.5rem`, the badge's existing `rounded-sm`, for the container, the inner panel, and the SVG path (`rx`/`ry` = 8). The badge keeps its design-system shape and only gains the moving glow.
  - Duration: Aceternity's default, 3000ms per lap.
- Hero: replace the `<p>` with `<MovingBorderBadge className="px-4 py-2 text-small font-semibold tracking-widest uppercase">Intelligent Learning</MovingBorderBadge>`, rendered as a `<div>`. It can't be a `<p>` because the glow's `<div>` and `<svg>` aren't valid inside a paragraph, which would cause a hydration error. It keeps its position and spacing, and it isn't a button because it was never interactive.
- No new packages.

## Files expected to touch

- New: `components/moving-border.tsx`
- Edit: `app/page.tsx` (hero badge only)

## Security considerations

None. This is a client-side visual only.

## Acceptance criteria

- The badge has the same size, text, and purple fill as before.
- A purple glow travels continuously around its 1px border.
- No layout shift in the hero.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome over CDP: two screenshots of the badge a moment apart, to show the glow has moved, and measure the badge size against before.

## Manual test steps

1. Open http://localhost:3000.
2. Above the heading, the "Intelligent Learning" badge has a purple light travelling around its edge.

## Addendum: grey badge, white-to-grey gradient text (follow-up request)

- Inner panel: replace the purple tint (`border-primary-200 bg-primary-100/80`) with dark grey, `bg-neutral-100/80` (`#161618`), and a hairline `border-white/10`. This matches the black and grey hero controls, such as the "Explore Courses" pill. The `backdrop-blur-xl` stays.
- The moving glow **stays purple** (`--color-primary-500`).
- Text: white-to-grey gradient, `bg-linear-to-r from-white to-neutral-700 bg-clip-text text-transparent`, on an inner `<span>`.
  - The project's neutral scale is inverted for the dark theme, so `neutral-700` is the light grey `#a1a1aa`. `neutral-300` would be a dark grey.
  - The panel's color classes move out of the shared base string, so the text color doesn't conflict with `text-transparent`. `cn` doesn't merge conflicting classes.
- Checks: type check, lint, and build; a close-up screenshot of the badge; sample the text's left and right ends (expect about white, then about `#a1a1aa`).
