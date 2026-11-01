# Bookmark button as the React Bits "Bell Toggle"

## Goal
Replace the labelled Bookmark / Saved button with the React Bits Bell Toggle (https://reactbits.dev/micro/bell-toggle):
- a pill toggle
- on press, the icon swings with small "waves", the label crossfades from "Bookmark" to "Saved", and the pill unfurls to fit the new label
- off: dark pill with light text; on: light pill with dark text, which matches the white and gray style the user likes

It is used on the course page side panel and next to the lesson title.

## Source
- Fetched from the official registry item `https://reactbits.dev/r/BellToggle-TS-TW.json` (TypeScript + Tailwind).
- Dependencies: `motion` (already installed), plus `@hugeicons/react` and `@hugeicons/core-free-icons`, used only for the default bell icon.

## Code inspected
- `components/bookmark-button.tsx`:
  - the shared saved-ids store (`useSavedIds`, optimistic `setSaved`)
  - variants `full` (labelled), `icon` (lesson rows in the Saved list) and `overlay` (on course card covers)
  - signed out, it wraps Clerk's `SignInButton`
- Usages:
  - `full`: course page side panel, lesson page title row
  - `icon`: catalog Saved lessons rows
  - `overlay`: catalog cards
- `components/spotlight-card.tsx`: the precedent for vendoring a React Bits component ("behavior and defaults unchanged; only the export style follows this project").
- `package.json`: `motion` ^14 provides the same `motion/react` API the component imports.

## Decisions
- **Vendor it** as `components/bell-toggle.tsx`. Behavior and defaults stay unchanged. Only these adaptations:
  - a named export, plus the attribution header
  - **no Hugeicons dependency**: the default icon becomes the project's own `bookmark` icon (duotone filled), since we always pass an icon anyway. This avoids adding two packages for an unused default.
- **Wire it in `BookmarkButton`** (`variant="full"`):
  - `<BellToggle pressed={isSaved} onChange={(next) => setSaved(id, next)} offLabel="Bookmark" onLabel="Saved" icon={<Icon name="bookmark" />} size="md" badge={false} />`. It is controlled by the shared store, so it stays in sync with the card and row buttons.
  - Colors use the component defaults: off `#27272a` with `#f5f5f5` text, on `#f5f5f5` with `#18181b` text.
  - `disabled` until Clerk has loaded.
  - **Signed out:** clicking calls Clerk's `openSignIn()` instead of saving, and the toggle stays off. `SignInButton` can't wrap it, because the component doesn't forward an onClick.
- **Layout:**
  - The toggle sizes to its label (the unfurl animation depends on that), so it is not stretched.
  - In the course side panel it sits centered under the full-width Continue Learning button.
  - On the lesson page it stays beside the title.
- **Unchanged:** the small icon-only buttons (`icon` and `overlay` on cards and saved rows). The Bell Toggle is a labelled pill and doesn't fit a 40px icon spot. Its swing respects reduced motion, as built in.

## Files
- `components/bell-toggle.tsx` (new, vendored)
- `components/bookmark-button.tsx`
- `app/courses/[slug]/page.tsx` (centering in the side panel)

## Security
None. Saving still goes through the existing Clerk-protected server route.

## Acceptance
- On the course and lesson pages:
  - clicking Bookmark rings the icon, the label crossfades to "Saved", and the pill turns light
  - clicking again reverts
  - the state persists across reloads, and matches the card and catalog bookmarks
- Signed out, clicking opens the sign-in modal.
- With reduced motion, there's no swing and the state just switches.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. `npm run dev`, sign in, open a course. Click Bookmark in the side panel and watch the animation and the "Saved" state.
2. Open `/courses?view=saved`: the course is there. Unsave it on its card, go back to the course page, and the toggle is off.
3. Open a lesson and toggle the bookmark next to the title.
4. Sign out, open a free-preview lesson, and click Bookmark. The sign-in modal opens.

## Revision after review
- The user rejected the vendored Bell Toggle: its pill size, text and look didn't fit the pages.
- The button is restored exactly as before: same size, font, "Bookmark" and "Saved" text, and full width in the course side panel.
- Only the toggle's **style and animation** were kept:
  - Saved uses the toggle's light pill colors (`#f5f5f5` background, `#18181b` text).
  - On save, the bookmark icon swings from its top with two small waves.
  - The label crossfades between Bookmark and Saved with a slight blur.
  - All motion is `motion-safe`.
- `components/bell-toggle.tsx` was removed.
- The icon-only card and row bookmarks get the same swing and waves.
