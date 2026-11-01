# "What you'll learn" as raised tiles, and a real site footer

## Goal
Implement the two recommendations the user accepted:
1. **What you'll learn** (course page):
   - Drop the outer box and the nested bordered cards.
   - Show 4 **raised tiles** in a 2×2 grid, in the same raised graphite style as the course cards and the side panel.
   - Icons sit in a small rounded tile, in light gray instead of purple, with brighter text.
2. **Footer:** replace the decorative-only purple bars with a **real footer** on top of **toned-down bars**:
   - the bars become a silver-to-graphite gradient at low opacity, full width with no gap, behind the content
   - left: the Roam logo and a one-line tagline
   - right: short link columns
   - a thin divider, then the copyright

## Code inspected
- `app/courses/[slug]/page.tsx`, the outcomes section:
  - a `rounded-lg border bg-surface p-6 sm:p-8` box
  - inside it, `rounded-md border p-6` cards with a 48px purple `MaybeIcon`, `text-heading-3` title and `text-subtle` description
- `components/footer-bars.tsx`:
  - 14 absolutely positioned bars with a purple gradient, in an `h-48` block
  - nothing covers 39–49%, which is the visible gap
  - used on home, `/courses`, course, instructor and My Learning pages; lessons have no footer
- `components/ui/logo.tsx`: the "Roam." wordmark.
- `components/ui/card.tsx`: the `raisedPanel` look (`border-white/10`, `from-white/[0.07] to-white/[0.02]`, inset top highlight).
- Live data: the outcome icons in use are `sparkles`, `code`, `workflow`, `gauge`, `layers`, `rocket`, `shield`, `puzzle`. These are the older stroked icons.
- Next 16 `cacheComponents`: a server component can't call `new Date()` during prerender without opting out of caching.

## Decisions

### Outcomes
- `<section>` with an `h2` "What you'll learn" (unchanged text), with no outer box.
- `ul` grid `gap-4 md:grid-cols-2`. Each `li` is a raised tile:
  - classes: `rounded-2xl border border-white/10 bg-linear-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_40px_-24px_rgba(0,0,0,0.8)]`
  - a gentle hover lift: `transition-transform hover:-translate-y-0.5`, `motion-safe` only
- **Icon tile:** `size-12 rounded-xl bg-white/[0.06] ring-1 ring-white/10 ring-inset`. The `MaybeIcon` is 24px in `text-[#d4d4d8]`, replacing the 48px purple.
- **Text:** the title is `text-heading-3 text-foreground` and the description `text-body leading-6 text-muted`, which is brighter than the current `text-subtle`.
- **Icons:** they render from the existing set, so they stay stroked until the user uploads duotone filled versions under the same names. No code change is needed when they arrive.

### Footer
- New `components/site-footer.tsx` (server), which replaces `<FooterBars />` on every page that has it.
- **Structure** (`relative overflow-hidden border-t border-white/[0.06]`):
  - **Bars backdrop:** `FooterBars` is recolored to `from-[#a1a1aa]/20 to-transparent` and given a bar covering 39–49% so there's no gap. It is absolutely positioned at the bottom and `aria-hidden`.
  - **Content** (`relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-14 pb-10`):
    - Left: the `Logo` at `text-heading-2`, and the tagline "Search your learning in plain English. Jump straight to the moment a topic is taught." in muted text.
    - Right: two link columns.
      - **Learn:** All Courses (`/courses`), My Learning (`/my-learning`), Saved (`/courses?view=saved`).
      - **Account:** Sign in (`/sign-in`), Create account (`/sign-up`).
      - Small uppercase column headings, and links that brighten on hover.
    - A thin divider, then a bottom row: "© 2026 Roam. All rights reserved." on the left, "Built with Next.js & Sanity" on the right.
- **Copyright year:** fixed at 2026, because calling `new Date()` in the server footer would break static prerendering under `cacheComponents`. The year is noted in a comment so it's easy to update.
- **Responsive:** columns stack on mobile, and the logo block sits above the links.

## Files
- `app/courses/[slug]/page.tsx` (outcomes)
- `components/site-footer.tsx` (new), `components/footer-bars.tsx` (color and gap)
- `app/page.tsx`, `app/courses/page.tsx`, `app/courses/[slug]/page.tsx`, `app/instructors/[slug]/page.tsx`, `app/my-learning/page.tsx` (swap `FooterBars` for `SiteFooter`)

## Security
None. Static links and presentation only.

## Acceptance
- Outcomes show as 4 raised tiles with no outer box: gray icon tiles, readable descriptions, 2 columns on desktop and 1 on mobile.
- Every page with a footer shows the logo, tagline, link columns, divider and copyright over soft silver bars with no gap. There's no purple in the footer.
- All footer links work. Signed-out users who click My Learning or Saved get the existing sign-in behavior.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. `npm run dev`, sign in, open a course, and scroll to "What you'll learn". Hover a tile.
2. Scroll to the footer on the course page, home, `/courses`, an instructor page and My Learning. Click each footer link.
3. Narrow the window to mobile width and check that the tiles and footer columns stack.

## Follow-up
- The footer's "Account" column (Sign in, Create account) was removed at the user's request. Only "Learn" remains.
- The user's redrawn `play-circle.svg` is wired in as a filled duotone glyph: the circle at 40% and a solid play triangle. It is used in lesson rows, the My Learning empty state, video lesson cards and status icons.

## Later removal
- At the user's request, the "What you'll learn" section was removed from the course page entirely, with its `outcomes` query projection and the 7 icons used only by it (`sparkles`, `workflow`, `gauge`, `layers`, `rocket`, `shield`, `puzzle`).
- The Studio `learningOutcomes` field and its content are kept: AGENTS section 8 lists them in the fixed course model, and removing them would orphan data.
- The footer from this plan is unchanged.
