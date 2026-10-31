# Smoother start after clicking play

## Goal
Clicking the poster's play button gives instant feedback, and the switch from poster to playing video feels smooth instead of a frozen pause followed by a jump.

## Code inspected
- `components/video-player.tsx`:
  - The YouTube IFrame API script loads only after the component mounts (hydration).
  - The poster is removed only when YouTube reports `PLAYING`, after its buffering.
  - Until then the poster sits frozen with no feedback, and then the poster and controls switch instantly.
  - A click before the API is ready is queued.

## Cause
YouTube needs roughly 0.5–2s to load and buffer after `playVideo()`. That network time can't be removed, but it can be:
- **Started earlier:** open the connections and fetch the API script before the user clicks.
- **Hidden:** show a loading state the moment they click, then fade the poster out.

## Decisions
- **Warm the connections early.** In the YouTube player, call React DOM's `preconnect()` for `https://www.youtube-nocookie.com`, `https://www.youtube.com`, `https://i.ytimg.com` and `https://www.google.com`. Call `preload()` for `https://www.youtube.com/iframe_api` as a script. These go into the page head during render, so the work starts with the HTML, not after hydration.
- **Instant feedback.** On click, the poster switches to a "loading" state right away. The triangle inside the white circle becomes a spinning ring, and the circle and chips dim slightly. The poster stays clickable-safe, so a second click doesn't toggle pause.
- **Smooth handoff.** When YouTube reports `PLAYING`, the poster fades out over 300ms (`transition-opacity`) and then unmounts, and the control bar fades in using its existing opacity transition.
- The resume, `?t=`, progress and keyboard behavior is unchanged. Vimeo and Bunny are unchanged: their own player loads right after the click.

## Files
- `components/video-player.tsx`

## Security
None. Only public provider origins are preconnected.

## Acceptance
- The click shows a spinner immediately, with no frozen moment.
- The poster crossfades into the playing video, and the controls fade in.
- Pause and play after that work as before.

## Checks
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test
1. `npm run dev`, sign in, open a lesson.
2. Click play. The spinner should appear instantly, then the video fades in and plays.
3. Throttle the network to Fast 4G in DevTools and repeat. The spinner should be visible the whole time, with no frozen frame.
4. Pause and play using the control bar and the Space key.
