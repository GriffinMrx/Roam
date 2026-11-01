# Hero: Swarm Cursor instead of the dot grid, gradient heading, category chips

## Goal
1. **Remove the dot grid completely** and use https://reactbits.dev/animations/swarm-cursor as the hero background effect.
2. **Gradient heading:** "Search your learning / in plain English." becomes a white → gray gradient. Only the color changes; the Tech Text effect stays as it is.
3. **Category chips** under the hero search, matching the reference (`images/3.png`): a single row of icon + label pills that fades out at both edges, starting with **All**.

## Skills and docs read
- AGENTS.md:
  - §3: match the reference; responsive down to mobile; reuse existing patterns
  - §7: ground in real data (the chips are the real Sanity categories)
- React Bits source for Swarm Cursor: `DavidHDev/react-bits`, `src/ts-tailwind/Animations/SwarmCursor/SwarmCursor.tsx`. It's WebGL2 with no dependencies; the page itself can't be read without JavaScript, so I took the code from the repository.

## Code inspected
- `app/page.tsx`: the hero has `<DotGrid activeColorVar="--color-white" />` behind its content, then two `TechText` lines, the CTA and `HomeSearchInput`.
- `components/dot-grid.tsx`: imported only by `app/page.tsx`. Old prompt files mention it as history.
- `components/tech-text.tsx`:
  - glyphs are painted on a canvas from a single `ink` color (`palette()` → `sprite()` fills and dashed outlines)
  - CSS gradients can't reach canvas text, so the gradient has to be applied in that paint step
- `components/course-search.tsx`: `CourseSearchProvider` shares the hero query with the home grid (`CourseResults`).
- `components/course-catalog.tsx`: the `/courses` category chips (the pattern I'm reusing for behavior, not looks).
- **Sanity categories** (6): AI Engineering, Backend & Infrastructure, Data, Languages, Security, Web Development.

## Decisions
### Swarm Cursor
- Add `components/swarm-cursor.tsx`: the React Bits TS-Tailwind source with **behavior and defaults unchanged**. Only the export style and `cn` class joining follow this project, as with `tech-text.tsx`.
- **In the hero,** the hero content is passed as `SwarmCursor` **children**, so the swarm can "pour around hovered buttons": its hover targets must be inside its container (the CTA, the search field and the chips).
- **Colors:** white particles (`color="#ffffff"`), matching the old dot grid's white hover. Default count and size.
- It respects `prefers-reduced-motion`, as the source already does.
- **Delete** `components/dot-grid.tsx` and its import and usage. Old prompt files that mention the dot grid stay as history.

### Gradient heading
- Add one optional prop to `TechText`: `gradient?: [string, string]`.
  - When set, glyph fills and outlines are painted with a vertical canvas `linearGradient` from the top to the bottom of the word box.
  - Everything else (reveal, dashes, accent, motion) is untouched.
- **Two-line heading:** a single gradient flows across both lines:
  - line 1 goes `#ffffff` → `#d4d4d8`
  - line 2 goes `#d4d4d8` → `#8b8b94`
  - This matches the white → gray treatment on the hero badge.

### Category chips
- **Data:** Sanity categories (`getCategories()`), with **All** first. The reference's labels (Fitness, Music…) are sample content, so I show the real categories.
- **Behavior:**
  - clicking a chip filters the home course grid in place (the category joins the existing search context, combined with the typed query)
  - **All** clears the filter
  - the selected chip has `aria-pressed`
- **Look, per the reference:**
  - a horizontal row of rounded-xl pills: dark graphite fill, a subtle 1px border, a 16px icon, then a medium-weight label
  - the row scrolls sideways, with edges that fade out (mask-image) on both sides
  - centered under the search, the same width as the search
  - the selected chip is slightly brighter

### Icons
- Chip icons use `MaybeIcon`, which renders an **empty 16px slot** until the SVG exists. None of our current icons match a category, so they all start empty.
- Please upload these to `assets/icons/` (duotone, 24×24), and I'll wire them in:
  - `all.svg` (the "All" chip; the reference shows a circular-arrows icon)
  - `ai-engineering.svg`
  - `backend-infrastructure.svg`
  - `data.svg`
  - `languages.svg`
  - `security.svg`
  - `web-development.svg`

## Files
- `components/swarm-cursor.tsx` (new), `components/dot-grid.tsx` (deleted)
- `components/tech-text.tsx` (the `gradient` prop)
- `components/course-search.tsx` (category in context, `HomeCategoryChips`, grid filter)
- `app/page.tsx`

## Security
UI only. Categories are public published content read server-side. No new APIs, tokens or client writes.

## Acceptance
- No dot grid anywhere, and `dot-grid` isn't referenced in code.
- A white particle swarm follows the cursor in the hero, curls around the CTA, the search and the chips when hovered, and roams when the pointer is away.
- The heading animates exactly as before, with a white → gray gradient from top to bottom across both lines.
- Chips appear under the search, as in the reference. Clicking "Data" shows only Data courses in the grid below; "All" restores them. Typing still filters within the chosen category.
- On mobile, the chips scroll sideways and the edges fade.

## Checks
`npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. Run `npm run dev` and open `/`.
2. Move the mouse over the hero: the swarm follows. Hover "Explore Courses": it pours around the button. Click: it bursts.
3. Check that the heading goes white to gray.
4. Click the "Data" chip: the grid shows Data courses. Type "sql": it narrows within Data. Click "All": everything is back.
5. Narrow the window to phone width: the chips scroll and fade at the edges.
