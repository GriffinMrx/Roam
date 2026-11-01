# Video player keyboard shortcuts

## Goal
The standard video-site shortcuts on the lesson page, so learners can control the video without clicking.

## Code inspected
`components/video-player.tsx` (`YouTubePlayer`):
- **Existing keys:** an `onKeyDown` on the player box handles `K`, and `Space` only while the box itself has focus. Once focus leaves the player, nothing works.
- **Actions already there:** `togglePlay`, `seek(t)` (clamped to the video length), `toggleCaptions`, `toggleFullscreen` and `revealControls`.
- YouTube's own keyboard handling is off (`disablekb: 1`) and its controls are hidden, so this player owns the shortcuts.
- Vimeo and Bunny lessons use the provider's own player and shortcuts; this change doesn't affect them.

## Shortcuts (the common set, as used on YouTube and similar sites)
| Key | Action |
|---|---|
| Space or K | Play / pause |
| ← or → | Back / forward 5 seconds |
| J or L | Back / forward 10 seconds |
| F | Full screen on / off |
| C | Captions on / off |
| 0–9 | Jump to 0%–90% of the video |
| Home / End | Jump to the start / end |

## Decisions
- **Page-wide:** the shortcuts work anywhere on the lesson page (one window listener while the player is mounted), not only when the player is focused.
- **Never steal typing or native keys:**
  - ignore keys while typing in an input, textarea, select or editable field (the lesson Discussion composer, search)
  - ignore keys held with Ctrl, Cmd or Alt, so browser shortcuts and ⌘K still work
  - **Space** is left to a focused button or link (it activates that control natively, so there's no double toggle). Anywhere else it toggles play and doesn't scroll the page.
  - **Arrow keys** are left to the seek slider while it's focused (it already moves with arrows), and to inputs.
- **Feedback:** each shortcut shows the control bar (the same as moving the mouse). Seeking shows the new time there.
- **Unchanged:** the existing player-box `onKeyDown` is replaced by the window listener, so behavior is the same or better when the player is focused.

## Files
`components/video-player.tsx`

## Security
UI only.

## Acceptance
- On a lesson page, after clicking anywhere outside an input, Space plays and pauses without scrolling the page.
- ← and → skip 5s, J and L skip 10s, F toggles full screen, C toggles captions, 5 jumps to the middle, and Home and End jump to the ends.
- Typing a space or arrows in the Discussion composer types normally and doesn't control the video.
- With a control button focused, Space triggers that button only once.

## Checks
`npx tsc --noEmit`, `npm run lint`, `npm run build`, plus a live Chrome DevTools check (press keys and read the player time and state).

## Manual test
1. Open a lesson, click the page background and press Space: it plays. Press Space again: it pauses, and the page doesn't scroll.
2. Press → and L, then ← and J: the time moves +5, +10, −5 and −10.
3. Press F, then Esc. Press C. Press 5: the video jumps halfway.
4. Type in the Discussion box: the video doesn't react.
