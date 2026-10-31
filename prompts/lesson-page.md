# Lesson page (design/vertex-lesson.png) with the video playing on the page

## Goal

Build `/lessons/[slug]` from `design/vertex-lesson.png`, wired to the seeded Sanity lessons. Embed the lesson video so it plays on the site, never sending the learner to YouTube. Match the reference's layout, spacing, typography, and states, using the app's dark theme and purple accent instead of the light and orange reference.

## Skills and docs read

- AGENTS.md:
  - §3 (exact UI, responsive, collapse the lesson sidebar on mobile)
  - §5 (read-only pages, server-only data)
  - §7 (provider embed with the provider's own player and start parameter; the result links to the lesson page with a start-seconds query param; the Notes tab is presentational; progress is not built)
  - §9 (YouTube, Vimeo, Bunny)
- sanity-best-practices `portable-text.md` (render with `@portabletext/react`, custom components per block style and list)
- Next.js 16 instant-navigation guide (`params` and `searchParams` inside `<Suspense>`), as applied on the course page

## Data inspected (seeded, read with the server token)

- `LESSON_QUERY` already returns:
  - the lesson: title, slug, `videoUrl`, thumbnail, `durationSeconds`, `studentCount`, notes, `keyPoints`, `proTip`, resources
  - its course through a reverse reference: title, slug, level, cover, instructor, and modules → lessons
- No lesson has a `summary` (0 of 120). Notes use the `normal` and `h2` styles and bullet lists, with no marks.
  - A typical lesson: an intro paragraph, the h2 "What this lesson covers", 3 bullets (the same text as `keyPoints`), and a closing paragraph.
- Resource `type` is `link` for every lesson. 34 of 120 lessons have a `proTip`. All 120 `videoUrl`s are `youtube.com/watch?v=…`.
- One video (`practical-web-security-sql-injection`, `AOXMDbc11AE`) has been deleted from YouTube, so its embed shows YouTube's "Video unavailable" message.

## Page anatomy, from the reference

1. `SiteHeader` (sticky glass), unchanged.
2. **Left sidebar** (300px, `border-r`, sticky under the header, scrolls on its own):
   - "← Back to course".
   - Course card: cover thumbnail, course title, "0% complete", and a thin `ProgressBar` at 0.
   - "Module N of M" header with a chevron, which collapses or expands the module list.
   - Modules: a numbered circle, title, and duration.
     - The current module is highlighted: a filled purple number and a tinted row. It's expanded, listing its lessons on a dotted timeline.
     - The current lesson shows "Now playing" and a filled purple play button. The other lessons show a hollow dot, a title, and a duration, and link to their own pages.
     - Other modules are collapsed, with a chevron that expands them.
   - Completed check marks from the reference are **not shown**, because progress isn't tracked yet.
3. **Main column:**
   - Breadcrumbs: All Courses › course › module › lesson.
   - A "Lesson 5.1" badge, numbered from module and lesson order.
   - The title, in display type, with a square **bookmark** icon button on the right (presentational).
   - Subtitle: `summary`, or the notes' first paragraph when there's no summary. In that case the paragraph isn't repeated in the Overview.
   - Meta: clock and duration, chart and level (from the course), users and "18,240 students" (full number, as in the reference).
   - **Video:** 16:9, `rounded-lg`, with the provider's own player in an `<iframe>`.
   - Tabs: **Lesson Content** (active, purple underline) and **Notes**.
     - Lesson Content shows an "Overview" heading with the notes rendered as Portable Text, then "In this lesson you will:" listing `keyPoints` with `check-circle` icons, then a **Pro Tip** callout (bulb icon, tinted surface) when `proTip` exists, then **Resources** cards in a 3-column grid (type icon, title, description, external-link icon).
     - Notes is presentational: an empty state, "Your notes for this lesson will appear here.", with no input and no saving, per §7.
4. **Previous / next bar** across the bottom of the main column:
   - "← Previous Lesson" (tertiary) with the previous lesson's title and duration.
   - The next lesson's title and duration with "Next Lesson →" (primary).
   - Previous and next follow course order across modules, and each side hides at the ends.

**Mobile** (there's no mobile reference): the sidebar collapses into a "Course content" disclosure above the main column, closed by default. The resource grid goes to 1 column, and the previous/next bar stacks.

## User changes at approval (these override the plan below)

1. **Custom video player like the reference.** This overrides AGENTS §7's "do not build a custom player", at the user's explicit request.
   - It is implemented as **custom controls on top of the provider's own player**: the YouTube IFrame Player API with YouTube's controls hidden (`controls=0`). Playback, streaming, captions, and quality stay YouTube's, and the video still plays on the site.
   - The control bar matches the reference: play/pause, back 10s, "current / total" time, a seekable purple progress bar with a knob, a playback-speed button ("1x"), a captions (CC) toggle, a settings menu (playback speed list), and fullscreen.
   - Before the first play, the lesson thumbnail with a centered play button covers YouTube's own UI. While playing, the controls fade after about 2.5s without pointer movement and reappear on movement or focus.
   - The space bar and "k" toggle play, and the arrow keys move the seek bar.
   - A deleted or private video triggers the API `onError` (codes 100, 101, 150): "This video is unavailable."
   - **Vimeo and Bunny** have no seeded content and different player APIs, so they keep their provider's native controls inside the same frame. A custom bar for them is a follow-up.
2. **No hand-drawn icons.** Remove the bulb drawing.
   - Any icon not in the set renders a placeholder: an empty slot of the same size for decorative icons, and a short visible text label inside player buttons so they stay usable.
   - Missing icons are listed in the final report, and the user will upload them.

## Video playback (AGENTS §7 and §9)

- `lib/video.ts` (new): `toEmbed(url, startSeconds)` returns `{ provider, src }`:
  - **YouTube** (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`) → `https://www.youtube-nocookie.com/embed/<id>?start=<s>&rel=0&modestbranding=1&playsinline=1`
  - **Vimeo** (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`) → `https://player.vimeo.com/video/<id>#t=<s>s`
  - **Bunny Stream** (`iframe.mediadelivery.net` or `player.mediadelivery.net/embed/<lib>/<id>`) → the same embed URL with `?t=<s>`
  - Unknown hosts → `null`. The page then shows "This video can't be played here", with no link out.
- The start second comes from the `?t=<seconds>` query parameter, the param search results will link with. It's parsed as a non-negative integer and ignored if invalid.
- `<iframe>` attributes:
  - `title="<lesson title>"`
  - `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`
  - `allowFullScreen`
  - `referrerPolicy="strict-origin-when-cross-origin"` (YouTube refuses embeds that send no referrer)
- No autoplay.
- `searchParams` is runtime data, so the video renders inside its own `<Suspense>`. The fallback is the lesson thumbnail at 16:9, so the shell stays instant and there's no layout shift.

## Decisions

- Route `app/lessons/[slug]/page.tsx`:
  - `generateStaticParams` from `getLessonSlugs()` (120 pages), `generateMetadata` for the title and description, and `notFound()` for unknown slugs.
  - Content goes in a `<Suspense>` skeleton, the same pattern as the course page, so there's no blocking-route insight.
- Live updates already apply: `getLesson` goes through `sanityFetch` with `defineLive`, so Studio edits appear without a reload.
- New components:
  - `components/lesson-sidebar.tsx` (client: module expand/collapse and the mobile disclosure)
  - `components/lesson-tabs.tsx` (client: the two tabs, with the Lesson Content panel passed in as server-rendered children)
  - `components/portable-text.tsx` (Portable Text components: paragraph, h2, h3, bullet and number lists with purple markers, links that open in a new tab with `rel="noreferrer"`)
- Resource type icons:
  - `documentation`, `guide`, `article`, and `link` → `file`
  - `repository` → `code`
  - `download` → `folder`
  - Every card ends with the `link-external` icon.
- **Missing icons** (bulb for Pro Tip, and the player controls) render placeholders through a shared `MaybeIcon` in `icon.tsx`. They aren't drawn. The user will upload them.
- "Back to course" and "Previous Lesson" use `arrow-right` rotated 180°, so no new arrow icon is needed.
- **Instructor:** the reference lesson page doesn't show one, so none is added. AGENTS §8 asks for the instructor on the lesson. That's flagged for the user rather than invented into the layout.
- **New dependency:** `@portabletext/react`, which is on AGENTS §6's stack list.

## Files expected to touch

- New:
  - `app/lessons/[slug]/page.tsx`
  - `components/lesson-sidebar.tsx`, `components/lesson-tabs.tsx`, `components/portable-text.tsx`, `components/video-player.tsx` (custom YouTube controls)
  - `lib/video.ts`
- Edit: `components/ui/icon.tsx` (`MaybeIcon`), `app/courses/[slug]/page.tsx` (use the shared `MaybeIcon`), `package.json`, `package-lock.json`
- No schema or query changes. `LESSON_QUERY` already returns everything.

## Security considerations

- Server-only reads, and no token in the browser (unchanged).
- Embeds use the provider's privacy-friendly domain (`youtube-nocookie.com`) and a strict referrer policy.
- Video IDs are parsed with strict patterns (`[\w-]{11}` for YouTube, digits for Vimeo, UUID or digits for Bunny), so arbitrary URLs can never be put into the `iframe` `src`.
- Resource links use `target="_blank" rel="noreferrer"`. The notes renderer only allows `http(s)` and `mailto` link hrefs.

## Acceptance criteria

- `/lessons/nextjs-app-router-in-depth-caching-and-revalidation` renders the sidebar, breadcrumbs, a "Lesson 3.2" badge, the title, subtitle, meta, a playable YouTube embed, the Overview (notes), the key points, the Pro Tip when present, Resources, and previous/next links.
- `?t=90` starts the embed at 1:30 (`start=90` in the iframe `src`).
- Course order is correct: the first lesson has no Previous, and the last has no Next.
- The course page's "Continue Learning" and lesson rows now land on a real page instead of a 404.
- Mobile at 390px: the sidebar is collapsed into a disclosure, nothing overflows, and the video stays 16:9.
- 120 lesson pages are prerendered. An unknown slug returns 404. No blocking-route insight.
- Type check, lint, and build pass.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Headless Chrome screenshots at 1280 and 390. The iframe `src` with and without `?t=`. Read the dev overlay or console for insights. Check previous/next at the course's first and last lessons. Check the 404.

## Manual test steps

1. Open a course page and click **Continue Learning**. The first lesson opens.
2. Click play. The video plays on the page.
3. Open the same lesson with `?t=90` at the end of the URL. The video starts at 1:30.
4. In the sidebar, the current lesson shows "Now playing". Open another module and click one of its lessons.
5. Use **Next Lesson** and **Previous Lesson** to move through the course.
6. Narrow the window to phone width. "Course content" collapses above the lesson.

## Execution notes

- Type check, lint, and build pass. 139 pages are prerendered, including all 120 lessons.
- In the browser:
  - Our Play button starts the YouTube video: the clock reads `0:05 / 25:21` after a few seconds.
  - `?t=90` gives the iframe `start=90`, and the clock starts at `1:30`.
  - The first lesson has no Previous, and the last has no Next.
  - The deleted video (`practical-web-security-sql-injection`) shows "This video is unavailable."
  - No blocking-route insight.
- The dev server served stale component code again ("Element type is invalid" during SSR), while the production build of the same code had no errors. Restarting the dev server and clearing `.next/dev` fixed it. This is the same Turbopack staleness seen with `globals.css`.
- Mobile: the seek bar moves to its own full-width row above the controls, because it was squeezed to a dot at 390px.
- Next 16 deprecates `priority` on images, so the LCP images now use `preload` (lesson poster and course cover).
- **Unknown slugs:** `/lessons/<unknown>` and `/courses/<unknown>` render the not-found UI with `noindex`, but HTTP status **200**. The content streams inside `<Suspense>`, so the status was already sent when `notFound()` runs. This is documented Next.js 16 behavior (`not-found.md`).
  - A real 404 would need a per-request existence check in Proxy (an extra Sanity query on every lesson and course request), or rendering outside Suspense (which brings back the blocking-route insight).
  - This is left for the user to decide. The course page has had the same behavior since it moved behind Suspense.

## Icons wired (user upload)

| Glyph | Source file | Note |
|---|---|---|
| `play` | `play.svg` | single tone |
| `pause` | `volume-low.svg` | The file name says volume, but its paths are two full-height bars, which is the pause glyph |
| `rewind-10` | `backward-10sec.svg` | |
| `closed-caption` | `closed-captioning.svg` | Its second tone is at 30% opacity, so it was mapped to `secondary` (rendered at the set's 40%) |
| `settings` | `settings-01.svg` | |
| `maximize` | `maximize.svg` | |
| `bulb` | `light-bulb.svg` | |

- `forward-10sec.svg` was also uploaded. It isn't used because the reference player has no forward button.
- **Minimize was not provided, and the icon set has no minimize or exit-fullscreen glyph.** Per the user ("must be minimize icon; if you failed to find it tell me"), it isn't substituted with an unrelated icon or a drawn one. The exit-fullscreen button keeps its "Exit" text label until a minimize icon is added as `assets/icons/minimize.svg`.

## Fix: grey rim around the player's rounded corners (follow-up)

- The user's screenshot showed a lighter purple-grey band (about `#49394A`, against `#352036` inside) tracing the player's rounded corner. Chrome doesn't always clip a composited iframe to a parent's `border-radius` with `overflow-hidden`, so the YouTube iframe's square corners showed past the curve.
- The iframe border was already 0 (`frameborder="0"`, computed `0px`), so it wasn't a CSS border.
- Fix in `components/video-player.tsx`:
  - The player frame gets `[clip-path:inset(0_round_var(--radius-lg))]` and `isolate`. `clip-path` clips iframes reliably. Fullscreen uses `[clip-path:none]`.
  - The iframe and its wrapper get `rounded-[inherit]` and `border-0`.
  - The Vimeo/Bunny frame gets the same clip.
  - The keyboard focus indicator moves from an outer ring, which `clip-path` would hide, to an inset outline (`-outline-offset-2`).
- Verified: computed `clip-path: inset(0px round 16px)`, iframe `border-radius: 16px`, and 4× corner close-ups while playing show no rim.
