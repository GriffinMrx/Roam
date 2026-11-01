# Settings: left menu and cards like the reference

## Goal
Restyle the Settings screen to match the reference screenshot (a dark admin-style settings page with "Domain Config" and "Manual Config" cards). The site header and footer stay; that was your choice. Only the area between them changes:
- a full-height left menu
- a content area with compact cards
- reference-style action buttons inside those cards

Features and text inside the panels stay the same.

## Reference (what I read from it)
- **Left menu:** a flush-left column (~230px) on the page's darkest background, with a thin divider line on its right edge.
  - **Section label:** small uppercase, muted and semibold ("CHANNELS" in the reference; "SETTINGS" here). The reference's "+" button is left out, because there's nothing to add here.
  - **Items:** an icon plus a 14px label, with no pill or background. Inactive items are muted gray (icon and text). The active item has bright text and a bright icon. Rows are ~33px apart.
- **Content area:** a slightly lighter background than the menu, with cards starting ~16px from the menu and from the top.
- **Cards:**
  - **Background:** a step lighter than the content area, with no visible border.
  - **Shape:** ~8px radius and ~18px padding. The card is as wide as its content, not full width.
  - **Spacing:** cards stack with a ~16px gap.
  - **Text:** title ~26px semibold, then a muted ~12px description directly under it, then the content.
- **Buttons in cards** ("Add Domain"): small rectangles (~32px tall, ~6px radius) in a dark gray fill with bright 13px medium text. Inputs are a darker fill with the same radius.
- **No page title** above the cards.

## Mapping to Roam tokens (both themes)

| Element | Classes |
|---|---|
| Menu | `bg-background border-r border-border` |
| Content area | `bg-neutral-50` |
| Card | `bg-neutral-100 rounded-sm p-5` |
| Card button | `h-8 rounded-[6px] bg-neutral-200 px-3 text-[13px] font-medium text-foreground hover:bg-neutral-300` |

- In dark mode that's black / #0c0c0e / #161618 / #1c1c1f, close to the reference's steps.
- In light mode the same tokens give a white content area, slate-50 cards and light-gray buttons, so light mode keeps working with no extra classes.
- Card title `text-heading-1`, description `text-small text-muted`.

## Code inspected
- **`app/settings/page.tsx`:**
  - The `h1` "Settings" and subtitle.
  - A `nav` with pill tabs (glossy active pill) and a Sign out button.
  - The `Panel` used by Learning, Appearance and Your data.
  - `SettingsSkeleton`.
  - Account renders Clerk's `UserProfile` (`components/settings/account-panel.tsx`).
- **Buttons inside the panels:**
  - **Save changes:** glossy pill, `components/settings/preferences-form.tsx`.
  - **Download my data:** glossy pill, `components/settings/data-actions.tsx`.
  - **Reset progress and Clear all bookmarks:** outline pills, `ConfirmAction` in the same file. They keep their red "armed" confirm state.

## Changes
1. **`app/settings/page.tsx` layout:**
   - `main` becomes full width: a menu column (`lg:w-60`, full height between the header and footer) and a content column.
   - The visible "Settings" heading and subtitle are removed, as in the reference. An `sr-only` `<h1>Settings</h1>` stays for screen readers.
2. **Menu:**
   - "SETTINGS" label, then Account / Learning / Appearance / Your data as icon + text links. Active: `text-foreground`. Inactive: `text-muted hover:text-foreground`.
   - Sign out is the last item, in the same style.
   - **Mobile (below `lg`):** the same items become a horizontally scrolling row above the cards, as today. The column and its divider only appear from `lg` up.
3. **`Panel` becomes a reference card:**
   - `w-fit max-w-full`, `bg-neutral-100`, `rounded-sm`, `p-5`, no border or shadow.
   - Title `text-heading-1`, description `text-small text-muted`, content `mt-5`.
   - Cards stack with `gap-4`.
4. **Reference card buttons:**
   - **Save changes and Download my data:** the dark rectangle style. Save keeps its disabled state while nothing has changed.
   - **Reset progress and Clear all bookmarks:** the same rectangle. The armed confirm step keeps its red fill and text.
5. **Account tab:** Clerk's profile sits inside a card like the others, so the screen looks consistent. Clerk's own border is removed so the card isn't doubled.
6. **`SettingsSkeleton`:** the same menu-plus-cards shape, so loading doesn't jump.

## Not changing
- The speed and theme choice pills and the switches. The reference has no equivalent control, so they keep their current look.
- The site header and footer (your choice), and every setting's behavior, route and text inside the panels.

## Files
`app/settings/page.tsx`, `components/settings/account-panel.tsx`, `components/settings/data-actions.tsx`, `components/settings/preferences-form.tsx`

## Security
UI only. Saving and data actions still go through the same server routes.

## Acceptance
- From desktop width up:
  - a flush-left menu with a divider
  - muted items, with the active item bright
  - compact, content-width cards in a lighter area
  - small dark rectangular action buttons
  - no page title
- Matches the reference's spacing and hierarchy in dark mode. Light mode stays readable.
- Mobile: the menu scrolls horizontally above the cards, with nothing cut off.
- Every tab works as before: profile edits, save preferences, theme switch, reset, clear, download.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Settings needs sign-in, so I can't screenshot it headless. I'll check the build output and the markup. You'll need to check it visually (steps below).

## Manual test
1. Run `npm run dev`, sign in, open Settings: a menu on the left, cards on the right.
2. Click each tab: the active item lights up and the cards change.
3. On Learning, change the speed: "Save changes" is enabled. Save it.
4. On Your data, click Reset progress: it turns red to confirm.
5. Switch to light mode and narrow the window to phone width.
