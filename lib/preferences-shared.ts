/** Learner preferences shared by the settings UI and the video player. Safe on the client. */

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type Preferences = {
  playbackRate: (typeof PLAYBACK_RATES)[number];
  /** Turn captions on when a lesson video starts. */
  captions: boolean;
  /** Pick up where the learner left off (without an explicit ?t=). */
  resume: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = { playbackRate: 1, captions: false, resume: true };
