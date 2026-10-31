# Hero heading with the reactbits Tech Text animation

## Goal

Render the home hero heading, "Search your learning in plain English.", with https://reactbits.dev/text-animations/tech-text.

## Sources read

- reactbits `src/ts-tailwind/TextAnimations/TechText/TechText.tsx` (about 1,075 lines, no dependencies) and the `TechTextDemo.jsx` presets, from GitHub `DavidHDev/react-bits`.
- `app/page.tsx` hero: `<h1 className="mt-8 max-w-3xl font-display text-display-1 text-balance sm:text-[4rem] sm:leading-[4.5rem]">`, which renders on two lines at 64px (48px on mobile), Poppins Bold, foreground color.

## How Tech Text works (constraints)

- It draws on a `<canvas>` inside a `div` (`relative w-full h-full`, `role="img"`, `aria-label={text}`), so the parent must give it a height.
- **It handles one line only** (a single baseline). The font starts at `fontSize` and shrinks to fit 90% of the width and 66% of the height.
- Hovering reveals dashed outlines, a selection box, and metric labels (letter-by-letter reveal). Letters can be dragged, and they spring back with a bounce. Clicking kicks a letter. It respects `prefers-reduced-motion`.
- With `fontFamily: ''` it uses the container's font (Poppins). With `color` and `accentColor` set to `currentColor`, it uses the text color (white foreground).

## Decisions

- Add `components/tech-text.tsx` with the reactbits TS + Tailwind source copied as-is. The only adaptations are a named export and `cn` for joining classes. All props and defaults are unchanged.
- **Keep the two-line heading from the design:** two `TechText` instances, "Search your learning" and "in plain English.", stacked inside the existing `<h1>`. A single instance would put the whole sentence on one line and shrink it to about 47px at desktop width.
- Font matches the current heading: `fontWeight={700}` (Bold) and `fontSize={64}`. Everything else uses reactbits defaults (the "vector" look): `letterSpacing -0.05`, dashed outline, letter reveal, labels, selection, draggable, click kick, sweep, specks 15, and white `currentColor` ink and accent.
- Each line gets a fixed height: `h-24` (96px) on desktop. The fit rule keeps the glyphs at about 64px and leaves room for the metric labels. On mobile the canvas shrinks the text to the width automatically, using `h-16`.
- Accessibility: the `<h1>` keeps its semantics. Its accessible name comes from the two `role="img"` labels, which read as the full sentence.

## Files expected to touch

- `components/tech-text.tsx` (new)
- `app/page.tsx` (hero `<h1>` contents only)

## Trade-offs

- The hero gets taller: the heading takes about 192px instead of 144px, to leave room for the labels and the drag bounce.
- `letterSpacing -0.05` (the reactbits default) sets the heading slightly tighter than the static design.
- The canvas text isn't selectable or copyable, by design.

## Security considerations

None. This is a client-only visual change.

## Acceptance criteria

- Both lines render in white Poppins Bold at the same position as before.
- Hovering shows the dashed outlines, selection box, and labels. Letters drag and bounce back, and clicking kicks a letter.
- On mobile the lines scale down without overflowing.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome over CDP: screenshot, hover a letter, screenshot again

## Manual test steps

1. Open http://localhost:3000.
2. Hover the heading. Dashed outlines and labels appear around the letters near the pointer.
3. Drag a letter and let go. It springs back.
4. Click a letter. It kicks.
5. Resize the window to phone width. Both lines still fit.
