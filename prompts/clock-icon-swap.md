# Swap the clock icon for the new clock.svg

## Goal
Every place that uses the `clock` icon shows the new design from `assets/icons/clock.svg`, an alarm clock with bells:
- course cards
- the course page meta row
- the lesson page meta row

## Code inspected
- `assets/icons/clock.svg`, the user's replacement. It is a **filled** two-tone icon: the face is light gray `#BABDCC`, and the hands and bells are dark `#12131A`.
- `components/ui/icon.tsx`. All glyphs are **stroked** (1.5px, `currentColor`), with primary paths at full opacity and secondary paths at 40%. A filled path would render as an outline there.
- Usages of `name="clock"` / `icon="clock"`: `components/ui/card.tsx`, `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`.

## Decisions
- Add an optional `filled?: true` flag to the `Glyph` type. Filled glyphs render with `fill="currentColor"` and no stroke. Every other icon is unchanged.
- Map the SVG's tones onto the existing two-tone convention:
  - The face (light) becomes `secondary`, at 40% opacity.
  - The hands and bells (dark) become `primary`, at full opacity.
- Both tones use `currentColor`, so the icon follows the surrounding text color on the dark theme. Hard-coded `#12131A` hands would disappear on the dark background.
- Keep the hands path's `evenodd` fill rule.

## Follow-up: chart and bell
- The user replaced `assets/icons/chart.svg` and added `assets/icons/bell.svg`, which replaces `bell-01.svg`. Both are filled duo-tone icons: a secondary layer at 30% and a primary layer at full.
  - **chart** (level meta on course cards, the course page and the lesson page): the full circle is the 40% tone, and the pie wedge is solid.
  - **bell** (the header notifications button): the bell body is the 40% tone, and the clapper is solid.
- Render both with the same `filled` flag. Use 40% for the secondary layer, the icon set's convention, so it matches the clock. The source files use 30%.

## Files
- `components/ui/icon.tsx`

## Acceptance
- The clock everywhere shows the alarm-clock shape: a filled face, solid hands, and two bells. It is tinted by the surrounding text color.

## Checks
- `npx tsc --noEmit`, `npm run lint`.

## Manual test
1. `npm run dev`, open `/` and look at the course cards' duration.
2. Open a course page, then a lesson page, and check the duration meta.
3. Check `/design-system` in the icons section.

## Follow-up: folder
- `assets/icons/folder.svg` was replaced with a filled duo-tone version: a 40% tray and a solid top tab. It is rendered with the same `filled` flag. It appears in the module count on course cards and on download resources on the lesson page.
- `assets/icons/bookmark.svg` was replaced the same way: a 40% page shape with two solid lines. It appears on the Bookmark buttons on the course and lesson pages.
- `assets/icons/user.svg` was replaced the same way: a 40% head and a solid body. The student counts on the course and lesson pages now use `user` instead of the `users` group icon. The `users` glyph stays in the set.
