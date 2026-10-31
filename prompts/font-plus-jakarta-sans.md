# Switch the app font to Plus Jakarta Sans

## Goal

Replace Poppins with Plus Jakarta Sans across the whole app: the web pages, the hero canvas heading, and the Clerk screens. The type scale (sizes, line heights, weights) stays the same.

## Code inspected

- `app/layout.tsx` loads `Poppins` from `next/font/google` with weights 400–700 and `variable: "--font-poppins"`. It applies `poppins.variable` on `<html>` and passes `fontFamily: "var(--font-poppins)"` to Clerk.
- `app/globals.css`: `--font-sans: var(--font-poppins), ui-sans-serif, system-ui, sans-serif`, with `--font-display: var(--font-sans)`. All Tailwind text uses these.
- `components/tech-text.tsx` (hero canvas) reads the container's computed `font-family`, so it follows `--font-sans` automatically.
- Docs and labels that name Poppins: `app/design-system/page.tsx` (the type-scale table "Font" column, the typography card title, and the button spec "Font: Poppins Medium") and the `components/ui/button.tsx` doc comment.
- `next/font/google` types: `Plus_Jakarta_Sans` exists, with weights 200–800 or `variable`.

## Decisions

- `app/layout.tsx`: import `Plus_Jakarta_Sans`, load it with `subsets: ["latin"]` and `variable: "--font-plus-jakarta-sans"`, and no `weight` list. It's a variable font, so one file covers 200–800, including the 400/500/600/700 the type scale uses. Drop the Poppins-specific comment. Clerk `fontFamily` becomes `var(--font-plus-jakarta-sans)`.
- `app/globals.css`: `--font-sans: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif`. `--font-display` still points at it.
- Design-system page and button comment: rename "Poppins" to "Plus Jakarta Sans". The descriptor line ("Geometric · Friendly · Highly legible") still fits and stays.
- No size or weight changes. Jakarta runs slightly narrower than Poppins, so text wraps a little later, but layouts don't depend on exact widths.
- No new packages. `next/font` self-hosts the font at build time.

## Files expected to touch

- `app/layout.tsx`, `app/globals.css`, `app/design-system/page.tsx`, `components/ui/button.tsx` (comment only)

## Security considerations

None. `next/font` downloads the font at build time and serves it from the app, so there are no runtime requests to Google.

## Acceptance criteria

- The computed `font-family` on `body`, the hero Tech Text canvas, and the Clerk sign-in card resolves to Plus Jakarta Sans.
- No "Poppins" left in app code, apart from git history.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- `grep -ri poppins app components lib` returns nothing
- Headless Chrome over CDP: `document.fonts.check('16px "Plus Jakarta Sans"')`, the computed `font-family` of `body`, and screenshots of `/` and a course page

## Manual test steps

1. Hard-refresh http://localhost:3000. Text renders in Plus Jakarta Sans, which has a slightly narrower, more modern look than Poppins.
2. The hero canvas heading uses the same font.
3. Open `/sign-in`. The Clerk card uses it too.
4. Open `/design-system`. The typography section names Plus Jakarta Sans.
