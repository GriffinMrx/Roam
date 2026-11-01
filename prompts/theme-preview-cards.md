# Settings → Appearance: theme preview cards

## Goal
Replace the Light/Dark/System pill buttons with the reference's three preview cards: System (split light/dark), Light and Dark. The selected card gets an orange outline.

## Code inspected
- `components/settings/theme-switch.tsx`: the pill radio group. It uses `useThemeChoice` and `setThemeChoice`, applies immediately and is stored per device.
- `app/settings/page.tsx` `AppearanceTab`: the `Panel` "Appearance" wrapping `ThemeSwitch`.
- `lib/theme-shared.ts`: `THEME_CHOICES = ["light", "dark", "system"]`.

## Decisions
- **Layout from the reference:**
  - The left column reads "Interface Theme" / "Select or customize your UI theme".
  - Three cards sit on the right, in order System, Light, Dark.
  - Each card is a rounded tile with a mini app window inset from the top-left and bleeding off the bottom-right. The window shows three traffic-light dots, a left column of four gray bars, and a content panel with a header block and two lines.
- **Colors are Roam's own, not the reference's** (owner's answer: "just the style, keep the colors and theme as they are in the application"):
  - **Light:** the app's light palette: tile `#f1f5f9`, window `#ffffff`, bars and blocks `#e2e8f0`.
  - **Dark:** the app's dark palette: tile `#000000`, window `#161618`, panel `#1c1c1f`, bars `#2a2a2d`.
  - **System:** the light preview on the left half and the dark preview on the right half.
  - **Window dots:** in the palette's bar color rather than red, yellow and green.
- **Selected state:** a 2px outline in the brand purple (`primary-500`) instead of the reference's orange. Unselected cards get a subtle `ink/10` outline that strengthens on hover.
- **Accessibility:** no visible labels, as in the reference. It stays a `radiogroup` with `role="radio"` buttons, `aria-checked`, and an `aria-label` per card ("System", "Light", "Dark").
- **Mobile:** the cards wrap and shrink to fit, keeping their proportions, and the label stacks above them.
- **Behavior unchanged:** it applies instantly and is saved on this device.

## Files
- `components/settings/theme-switch.tsx`

## Security
- None. Client-only display preference stored in localStorage, as before.

## Acceptance
- Settings → Appearance shows the three cards like the reference. Clicking one switches the theme at once and moves the orange outline.

## Checks
- tsc and lint.
- Screenshot in both themes.

## Manual test
1. Open Settings → Appearance.
2. Click Light: the site turns light and the middle card gets the outline.
3. Click Dark, then System: the theme and the outline follow each time.
