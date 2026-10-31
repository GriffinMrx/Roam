# Sign in button: glossy pill in white and gray

## Goal
Restyle the header "Sign in" button to match the reference "Start a free trial" button (pill shape, vertical gradient, soft inner top highlight, drop shadow), but in white and gray instead of purple.

## Inspected
- `components/site-header.tsx`: the Sign in button uses `buttonStyles({ variant: "primary", size: "md" })` inside Clerk's `SignInButton`.
- `components/ui/button.tsx`: shared variants. Nothing pill-shaped or gradient exists yet.

## Decisions
- Change only the header button via a `className` override on `buttonStyles`. No new shared variant, since only this button uses the look.
- Pill: `rounded-full`, `h-12 px-6`, medium weight, matching the reference proportions.
- Colors: gradient `from-white to-[#d4d4d8]` (top to bottom), `text-neutral-950`, 1px `border-[#d4d4d8]`, inset top white highlight and a soft drop shadow.
- Hover: slightly darker gradient bottom (`to-[#b4b4bb]`).
- Literal grays, not `neutral-*`: the theme's neutral scale is inverted for dark mode (`neutral-200` is `#1c1c1f`, `neutral-900` is near white).

## Files
- `components/site-header.tsx`

## Security
None. Presentational only.

## Acceptance
- Signed out, the header shows a white-to-gray gradient pill "Sign in" button with dark text.
- Clicking it still opens Clerk sign-in.

## Checks
- `npx tsc --noEmit`, `npm run lint`.

## Manual test
1. `npm run dev`, sign out, open `/`.
2. Compare the header button to the reference; hover it; click it to confirm Clerk opens.
