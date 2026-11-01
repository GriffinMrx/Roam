# Light mode: glossy buttons in neutral dark gray (not slate blue)

## Goal
In light mode, the glossy buttons ("Start Learning", the header "Sign in", active tabs and filters, speed and theme pills, switches, the saved Bookmark) look bluish. Make them neutral dark gray. Keep the style (gradient, gloss, shadow, shape) the same.

## Cause
In `app/globals.css`, the light-mode gloss tokens use slate grays, which have a blue tint:
- `--color-gloss-from` #334155 and `--color-gloss-to` #0f172a
- hover: `--color-gloss-hover-from` #475569 and `--color-gloss-hover-to` #1e293b

## Change (only the light-mode values; dark mode is untouched)

| Token | Now (slate) | New (neutral zinc) |
|---|---|---|
| `--color-gloss-from` | #334155 | #3f3f46 |
| `--color-gloss-to` | #0f172a | #18181b |
| `--color-gloss-hover-from` | #475569 | #52525b |
| `--color-gloss-hover-to` | #1e293b | #27272a |

The glossy pill shadow in light mode (`--shadow-pill`) also uses a slate shadow color, `rgba(15, 23, 42, …)`. It changes to neutral `rgba(24, 24, 27, …)` so no blue shows in the shadow either.

## Files
`app/globals.css` (light block only).

## Security
None. These are color values only.

## Acceptance
- In light mode, "Start Learning", "Sign in", active filter and tab pills, switches and the saved Bookmark are neutral dark gray, with the same shape, gradient direction, gloss highlight and shadow.
- Dark mode is unchanged.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Headless screenshot of `/courses` in light mode, plus a sample of the active pill's pixel color: R, G and B should be equal, with no blue lean.

## Manual test
1. Settings → Appearance → Light.
2. Open a course page: "Start Learning" is dark gray. The header "Sign in" and the "All courses" pill on `/courses` match it.
