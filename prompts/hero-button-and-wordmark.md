# Hero "Explore Courses" button as Aceternity Hover Border Gradient, and a text-only Roam logo

## Goal

1. Replace the hero's "Explore Courses" button with https://ui.aceternity.com/components/hover-border-gradient.
2. Make the button's hover highlight **white** instead of Aceternity's blue.
3. Make the logo the "Roam" wordmark only, removing the "V" mark icon.

## Sources read

- The Aceternity registry entry (`https://ui.aceternity.com/registry/hover-border-gradient.json`): one file, `components/ui/hover-border-gradient.tsx`, with dependency `motion`.
  - A white radial "spotlight" travels around the 1px border every `duration` seconds: TOP → LEFT → BOTTOM → RIGHT.
  - On hover it animates to `highlight`, a centred radial gradient in `#3275F8`.
  - The container is `rounded-full` with a `bg-black/20` ring. The inner pill is `bg-black text-white px-4 py-2`.
- `app/page.tsx` hero: `<Link href="#courses" className={buttonStyles({ className: "mt-10 px-6 shadow-md" })}>Explore Courses <Icon arrow-right/></Link>`.
- `components/ui/logo.tsx`: an inline `V` SVG mark plus the "Roam" text. It's used by `Navbar` (site header) and the design-system page.

## Decisions

- Add `components/hover-border-gradient.tsx` with the Aceternity source, keeping its behavior and classes, with these adaptations:
  - `cn` from `@/lib/cn`.
  - `highlight` changed to **white**: `radial-gradient(75% 181.16% at 50% 50%, #ffffff 0%, rgba(255, 255, 255, 0) 100%)`, as requested.
  - The rotation interval moves inside the effect with complete dependencies (`hovered`, `duration`, `clockwise`), so it passes `react-hooks/exhaustive-deps` without changing behavior.
  - The `dark:` variants are folded into the base classes, because the app is dark-only: container `bg-white/20`, inner `bg-black text-white`.
- **New dependency:** `motion`, which the component requires and Aceternity lists. It's used only by this client component.
- Hero usage: `<HoverBorderGradient as="a" href="#courses" containerClassName="mt-10" className="flex items-center gap-2 px-6 py-2.5 text-body-lg font-medium">Explore Courses <Icon arrow-right/></HoverBorderGradient>`.
  - It keeps the arrow and the label, and stays a link to `#courses`. It uses a plain `<a>` because a server page cannot pass the `Link` component to a client component, and a same-page hash link needs no client routing.
  - The pill shape and black fill follow Aceternity rather than the design-system purple button, as requested.
- **Logo:** remove the SVG from `Logo` so it renders only the "Roam" wordmark at the same font size and weight, and update the doc comment. This changes the header and the design-system page. Nothing else uses the mark.

## Files expected to touch

- New: `components/hover-border-gradient.tsx`
- Edit: `app/page.tsx` (hero button), `components/ui/logo.tsx`, `package.json`, `package-lock.json` (`motion`)

## Security considerations

None. These are client-side visuals only.

## Acceptance criteria

- The hero button is a black pill with a white glow circling its border. On hover the glow becomes a soft white highlight around the whole border.
- Clicking the button still scrolls to the courses section.
- The header shows "Roam" with no icon.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome over CDP: a screenshot of the button idle and hovered, plus a crop of the header logo

## Manual test steps

1. Open http://localhost:3000. The "Explore Courses" pill has a white light moving around its border.
2. Hover it. The border lights up white all around, and the glow stops moving.
3. Click it. The page scrolls to "All Courses".
4. The top-left logo reads "Roam" with no icon.

## Addendum: hero dot grid hovers white (follow-up request)

- The hero `<DotGrid />` blends dots toward `--color-primary-500` (purple) near the pointer. Make it white: `<DotGrid activeColorVar="--color-white" />` in `app/page.tsx`. The resting dots keep `--color-neutral-200`.
- Found while checking: the production CSS minifies `--color-white` to `#fff`, and `parseHex` in `components/dot-grid.tsx` only accepts 6-digit hex. In a production build it would return `null`, and the dots would silently fall back to the purple default.
  - Fix: `parseHex` also accepts 3-digit hex by expanding `#fff` to `#ffffff`.
  - The fallback default also changes from purple to white, matching the new hero color.
- Checks: type check, lint, and build. Hover the hero over CDP and sample the dot colors near the pointer, expecting white or grey, not purple. Check the dev and production CSS values.

## Addendum: wordmark reads "Roam." (follow-up request)

- `components/ui/logo.tsx` renders `Roam.`, with a trailing period, in the header and on the design-system page. The weight and size are unchanged.
- The period is wrapped in `<span aria-hidden>`, so the accessible name stays "Roam" and screen readers don't announce the period. A bare `aria-label` on a `span` isn't reliably read.
- The hero sentence ("Roam understands what you want…") is not the logo and doesn't change.
- Checks: type check, lint, and the header markup shows `Roam.`.
