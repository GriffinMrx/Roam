# Lesson video: poster with a big white play button before playback

## Goal
Before the learner clicks, the lesson video shows like the reference. Clicking it starts playback and reveals the existing video player, including its control bar.
- The poster frame at full brightness.
- A large white circular play button centered, with a solid dark play triangle and a soft shadow.
- A dark gradient fading up from the bottom edge.
- No control bar.

## Skills and docs read
- AGENTS.md §3 (reproduce the reference, responsive), §7 (provider embed, no player out to the provider, `?t=` start).
- Next.js `next/image` remote images (`images.remotePatterns`).

## Code inspected
- `components/video-player.tsx`:
  - YouTube runs through the IFrame API with a custom control bar.
  - The current pre-play overlay is the poster at 70% opacity on black, with a small purple play button.
  - The control bar is visible before the first play.
  - Vimeo and Bunny render their iframe directly with native controls.
- `app/lessons/[slug]/page.tsx`:
  - The poster comes from the lesson thumbnail in Sanity.
  - `VideoFallback` is the Suspense placeholder (poster at 70% opacity).
- `lib/video.ts` (`embedUrl`), `next.config.ts` (remote images allow only `cdn.sanity.io`), `components/ui/icon.tsx` (no filled play glyph).

## Decisions and assumptions
- Clarified with the user:
  - **Title chip, top-left.** A dark translucent rounded chip (`bg-black/70`, white semibold text) holding a small round badge with the instructor's first initial, then the lesson title. The title truncates on narrow screens.
  - **No info chip.** Duration and student count are already shown on the lesson page.
  - **Copy-link chip, top-right.** It has a link icon and copies the lesson URL to the clipboard. If the video has a start second (`?t=`), the copied link includes it. The chip shows a short "Copied" state. Clicking it does not start playback.
  - No comment or open-external chips. Open-external would send learners off-site (AGENTS §7).
  - The caption box in the reference is part of that video's own frame, so it is not built.
- The chips sit on the poster only (the pre-play state). They go away with the poster once the video plays.
- **Shared `VideoPoster` component** (in `video-player.tsx`), used by all providers and by the Suspense fallback so nothing flashes:
  - The poster image uses `object-cover` at full opacity.
  - A bottom gradient `from-black/85 via-black/40 to-transparent` covers the lower ~45%.
  - The play button is a white circle (`size-16 sm:size-24 lg:size-28`) with an inline solid triangle SVG in near-black, nudged right for optical centering, and `shadow-xl`.
- **Poster fallback.** When a lesson has no Sanity thumbnail and the video is YouTube, use YouTube's own frame (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`). Add `i.ytimg.com` to `images.remotePatterns`. Otherwise the poster is a plain black background.
- **YouTube.**
  - The overlay shows until the first play.
  - The control bar is hidden until then.
  - Clicking anywhere on the video, or pressing Space or K, plays it.
  - Resume and `?t=` logic is unchanged.
  - The play button is a real `<button>` with the label "Play video: <title>", so it works with the keyboard.
- **Vimeo and Bunny.** Show the same poster. On click, mount the iframe with the provider's autoplay param (`autoplay=1` for Vimeo, `autoplay=true` for Bunny), keeping the start param. Playback still happens in the provider's own embed.
- The click starts playback directly; there is no extra loading state. If the YouTube API isn't ready yet, the click is queued and plays once it is ready.

## Files
- `components/video-player.tsx`
- `lib/video.ts`: `youtubeThumbnail()` and an `autoplay` option on `embedUrl`.
- `app/lessons/[slug]/page.tsx`: poster fallback, and `VideoFallback` uses `VideoPoster`.
- `next.config.ts`: allow `i.ytimg.com`.

## Security
- Only strictly validated video IDs go into thumbnail and embed URLs, as today. No tokens are involved.

## Acceptance
- On the lesson page before clicking: full-brightness poster, centered white round play button, dark bottom gradient, and no controls.
- A title chip (instructor initial plus lesson title) shows top-left, and a copy-link chip top-right. Copying does not start the video.
- One click starts the video, the poster disappears and the custom controls appear (YouTube).
- `?t=60` still starts at 60 seconds, and resume still works.
- On mobile the button scales down and stays centered.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (config changed).

## Manual test
1. `npm run dev`, sign in, open any lesson.
2. Compare the pre-play state with the reference.
3. Click. The video plays and the controls show.
4. Open the lesson with `?t=60` and click. It starts at 1:00.
5. Narrow the window to mobile width and check that the button scales and stays centered.
