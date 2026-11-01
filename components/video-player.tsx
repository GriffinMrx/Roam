"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { preconnect, preload } from "react-dom";
import { useCourseProgress } from "@/components/course-progress";
import { Icon, MaybeIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isComplete, savedStart } from "@/lib/progress";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/preferences-shared";
import { embedUrl, formatClock, type VideoSource } from "@/lib/video";

/*
 * Lesson video player. YouTube plays through its own player (IFrame Player API) with
 * YouTube's controls hidden and this component's control bar on top, so the video
 * stays on the site with the provider's playback, captions, and quality.
 * Vimeo and Bunny keep their native controls (no custom bar for them yet).
 */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  loadModule(name: string): void;
  unloadModule(name: string): void;
  destroy(): void;
};

type YTEvent = { target: YTPlayer; data: number };

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, options: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Window event other components (the lesson discussion's timestamp chips) dispatch to
 * jump the lesson video. The YouTube player marks it handled; otherwise callers fall
 * back to the ?t= link.
 */
export const SEEK_EVENT = "roam:seek";
export type SeekRequest = { seconds: number; handled?: boolean };

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const YOUTUBE_API = "https://www.youtube.com/iframe_api";
const YOUTUBE_ORIGINS = [
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://i.ytimg.com",
  "https://www.google.com",
];

let apiReady: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  apiReady ??= new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = YOUTUBE_API;
    script.async = true;
    document.head.appendChild(script);
  });
  return apiReady;
}

/** First play with no ?t=: pick up where the learner left off (the playhead timer syncs the clock). */
function firstPlay(player: YTPlayer, resumeAt: number) {
  if (resumeAt > 0) player.seekTo(resumeAt, true);
  player.playVideo();
}

/** A player control icon; until the icon is uploaded it shows a short text label instead. */
function ControlIcon({ name, label, size = 22 }: { name: string; label: string; size?: number }) {
  return (
    <MaybeIcon
      name={name}
      size={size}
      fallback={<span className="text-small font-semibold tracking-wide">{label}</span>}
    />
  );
}

function ControlButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-sm px-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white",
        pressed && "text-primary-400",
      )}
    >
      {children}
    </button>
  );
}

function CopyLinkChip({ start }: { start: number }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const url = new URL(window.location.pathname, window.location.origin);
    if (start > 0) url.searchParams.set("t", String(Math.floor(start)));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions or insecure context): nothing to copy to
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy link to this lesson"}
      className="pointer-events-auto flex h-9 shrink-0 items-center gap-2 rounded-md bg-black/70 px-3 text-small font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/85"
    >
      {copied ? (
        <>
          <Icon name="check-circle" size={18} />
          Copied
        </>
      ) : (
        <svg aria-hidden width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6" />
          <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
        </svg>
      )}
    </button>
  );
}

/**
 * Pre-play state: the poster frame, a title chip (instructor initial + lesson title),
 * a copy-link chip, a dark bottom fade, and a big white play button.
 * Without `onPlay` it is a static placeholder (the lesson page's Suspense fallback).
 */
export function VideoPoster({
  poster,
  title,
  instructor,
  start = 0,
  onPlay,
  loading = false,
  leaving = false,
}: {
  poster?: string;
  title: string;
  instructor?: string;
  start?: number;
  onPlay?: () => void;
  /** Play was clicked and the video is buffering: the button shows a spinner. */
  loading?: boolean;
  /** The video is playing: the poster fades out (the parent unmounts it afterwards). */
  leaving?: boolean;
}) {
  const initial = instructor?.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 bg-black transition-opacity duration-300 ease-out",
        leaving && "pointer-events-none opacity-0",
      )}
    >
      {poster && (
        <Image src={poster} alt="" fill preload sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-black/85 via-black/40 to-transparent" />

      <button
        type="button"
        onClick={loading ? undefined : onPlay}
        disabled={!onPlay}
        aria-label={loading ? `Loading video: ${title}` : `Play video: ${title}`}
        aria-busy={loading}
        className={cn(
          "absolute inset-0 flex items-center justify-center disabled:cursor-default",
          loading ? "cursor-progress" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "flex size-16 items-center justify-center rounded-full bg-white text-neutral-950 shadow-xl transition-transform duration-200 sm:size-24 lg:size-28",
            loading && "scale-90",
          )}
        >
          {loading ? (
            <span
              aria-hidden
              className="size-[38%] animate-spin rounded-full border-[3px] border-neutral-950/15 border-t-neutral-950"
            />
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="ml-[6%] size-[38%]" fill="currentColor">
              <path d="M7 4.6c0-1.2 1.3-1.9 2.3-1.3l11 7.4c.9.6.9 2 0 2.6l-11 7.4c-1 .7-2.3-.1-2.3-1.3V4.6Z" />
            </svg>
          )}
        </span>
      </button>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 transition-opacity duration-200 sm:inset-x-4 sm:top-4",
          loading && "opacity-60",
        )}
      >
        <p className="flex h-9 min-w-0 items-center gap-2 rounded-md bg-black/70 pr-3 pl-1.5 text-small font-semibold text-white backdrop-blur-sm sm:text-body">
          {initial && (
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-small">
              {initial}
            </span>
          )}
          <span className="truncate">{title}</span>
        </p>
        {onPlay && <CopyLinkChip start={start} />}
      </div>
    </div>
  );
}

export function VideoPlayer({
  source,
  start = 0,
  title,
  poster,
  instructor,
  durationHint = 0,
  lessonId,
  resume = false,
  preferences = DEFAULT_PREFERENCES,
}: {
  source: VideoSource;
  /** Start position in seconds (from the lesson page's ?t= param). */
  start?: number;
  title: string;
  /** Poster image URL shown before the first play. */
  poster?: string;
  /** Instructor name; its initial badges the title chip on the poster. */
  instructor?: string;
  /** Duration from Sanity, shown until the player reports its own. */
  durationHint?: number;
  /** When set (inside a CourseProgressProvider), watch progress is reported for this lesson. */
  lessonId?: string;
  /** No explicit start time: resume the learner's saved position on first play. */
  resume?: boolean;
  /** The learner's settings (default speed, captions); defaults when signed out. */
  preferences?: Preferences;
}) {
  if (source.provider !== "youtube") {
    return (
      <EmbedPlayer source={source} start={start} title={title} poster={poster} instructor={instructor} />
    );
  }
  return (
    <YouTubePlayer
      id={source.id}
      start={start}
      title={title}
      poster={poster}
      instructor={instructor}
      durationHint={durationHint}
      lessonId={lessonId}
      resume={resume}
      preferences={preferences}
    />
  );
}

/** Vimeo and Bunny: poster first, then the provider's own embed (native controls), autoplaying. */
function EmbedPlayer({
  source,
  start,
  title,
  poster,
  instructor,
}: {
  source: VideoSource;
  start: number;
  title: string;
  poster?: string;
  instructor?: string;
}) {
  const [started, setStarted] = useState(false);

  return (
    <div className="relative isolate aspect-video w-full overflow-hidden rounded-lg bg-black [clip-path:inset(0_round_var(--radius-lg))]">
      {started ? (
        <iframe
          src={embedUrl(source, start, { autoplay: true })}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <VideoPoster
          poster={poster}
          title={title}
          instructor={instructor}
          start={start}
          onPlay={() => setStarted(true)}
        />
      )}
    </div>
  );
}

function YouTubePlayer({
  id,
  start,
  title,
  poster,
  instructor,
  durationHint,
  lessonId,
  resume,
  preferences,
}: {
  id: string;
  start: number;
  title: string;
  poster?: string;
  instructor?: string;
  durationHint: number;
  lessonId?: string;
  resume?: boolean;
  preferences: Preferences;
}) {
  // Read by the player's event handlers, which are created once per video.
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Open YouTube's connections and fetch its API with the page, not after hydration,
  // so the first play has less to wait for.
  for (const origin of YOUTUBE_ORIGINS) preconnect(origin);
  preload(YOUTUBE_API, { as: "script" });

  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Play clicked, waiting for YouTube to buffer (spinner on the poster). */
  const [loading, setLoading] = useState(false);
  /** The poster has finished fading out and can unmount. */
  const [posterGone, setPosterGone] = useState(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(start);
  const [duration, setDuration] = useState(durationHint);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>(SPEEDS);
  const [captions, setCaptions] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watch progress → CourseProgressProvider (optimistic UI + POST /api/progress).
  const progressCtx = useCourseProgress();
  const reportRef = useRef(progressCtx?.report);
  const completeSent = useRef(false);
  const alreadyDone = Boolean(lessonId && progressCtx?.doneLessons.has(lessonId));
  useEffect(() => {
    if (alreadyDone) completeSent.current = true;
  }, [alreadyDone]);
  /** Saved second to resume at (0 when finished, unknown, or an explicit ?t= was given). */
  const resumeAt = resume && lessonId && progressCtx?.status === "ready" ? savedStart(progressCtx.progress, lessonId) : 0;
  /** Nothing is saved until the video has actually played. */
  const hasPlayed = useRef(false);
  /** Poster clicked before the YouTube API was ready: play as soon as it is. */
  const playRequested = useRef(false);
  const resumeAtRef = useRef(resumeAt);
  useEffect(() => {
    resumeAtRef.current = resumeAt;
  }, [resumeAt]);
  useEffect(() => {
    reportRef.current = progressCtx?.report;
  }, [progressCtx]);
  const sendProgress = useCallback(
    (options?: { ended?: boolean; keepalive?: boolean }) => {
      const player = playerRef.current;
      const report = reportRef.current;
      if (!player || !report || !lessonId || !hasPlayed.current) return;
      const duration = player.getDuration();
      if (duration > 0) report({ lessonId, position: player.getCurrentTime(), duration, ...options });
    },
    [lessonId],
  );
  const sendProgressRef = useRef(sendProgress);
  useEffect(() => {
    sendProgressRef.current = sendProgress;
  }, [sendProgress]);

  // Create the YouTube player in a node React doesn't manage (the API replaces it with an iframe).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player(mount, {
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          start,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: YTEvent) => {
            if (cancelled) return;
            setReady(true);
            const d = e.target.getDuration();
            if (d > 0) setDuration(d);
            const available = e.target.getAvailablePlaybackRates();
            if (available?.length) setRates(available);
            if (playRequested.current) firstPlay(e.target, resumeAtRef.current);
          },
          onStateChange: (e: YTEvent) => {
            if (cancelled) return;
            setPlaying(e.data === PLAYING);
            if (e.data === PLAYING) {
              // First play: apply the learner's default speed and captions setting.
              if (!hasPlayed.current) {
                const prefs = preferencesRef.current;
                if (prefs.playbackRate !== 1) e.target.setPlaybackRate(prefs.playbackRate);
                if (prefs.captions) {
                  e.target.loadModule("captions");
                  setCaptions(true);
                }
              }
              hasPlayed.current = true;
              setStarted(true);
              const d = e.target.getDuration();
              if (d > 0) setDuration(d);
            }
            if (e.data === PAUSED || e.data === ENDED) setCurrent(e.target.getCurrentTime());
            if (e.data === PAUSED) sendProgressRef.current();
            if (e.data === ENDED) {
              completeSent.current = true;
              sendProgressRef.current({ ended: true });
            }
          },
          onPlaybackRateChange: (e: YTEvent) => !cancelled && setRate(e.data),
          onError: (e: YTEvent) => {
            if (cancelled) return;
            setError(
              e.data === 100 || e.data === 101 || e.data === 150
                ? "This video is unavailable."
                : "This video can’t be played right now.",
            );
          },
        },
      });
    });

    return () => {
      cancelled = true;
      // Leaving the lesson (client navigation unmounts the player): save where we were.
      sendProgressRef.current({ keepalive: true });
      playerRef.current?.destroy();
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [id, start]);

  // Track the playhead while playing; report completion the moment it is reached.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const t = playerRef.current?.getCurrentTime();
      if (typeof t !== "number") return;
      setCurrent(t);
      const d = playerRef.current?.getDuration() ?? 0;
      if (!completeSent.current && isComplete(t, d)) {
        completeSent.current = true;
        sendProgress();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [playing, sendProgress]);

  // Save the resume position every 10s while playing.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => sendProgress(), 10_000);
    return () => clearInterval(timer);
  }, [playing, sendProgress]);

  // Flush the position when the tab is hidden or the page is left.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") sendProgress({ keepalive: true });
    };
    const onPageHide = () => sendProgress({ keepalive: true });
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sendProgress]);

  // Fullscreen state follows the browser (Esc exits too).
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Controls fade while playing after a short idle period.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  }, []);
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);
  const showControls = !playing || controlsVisible || settingsOpen;

  // Once playing, let the poster finish its 300ms fade before unmounting it.
  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => setPosterGone(true), 300);
    return () => clearTimeout(timer);
  }, [started]);

  const togglePlay = () => {
    // Instant feedback on the first play; YouTube may still need to buffer.
    if (!hasPlayed.current) setLoading(true);
    const player = playerRef.current;
    if (!player || !ready) {
      playRequested.current = true;
      return;
    }
    if (playing) return player.pauseVideo();
    if (!hasPlayed.current) return firstPlay(player, resumeAt);
    player.playVideo();
  };

  const seek = (to: number) => {
    const t = Math.min(Math.max(0, to), duration || to);
    setCurrent(t);
    playerRef.current?.seekTo(t, true);
  };

  const changeRate = (next: number) => {
    playerRef.current?.setPlaybackRate(next);
    setRate(next);
  };
  const cycleRate = () => {
    const list = rates.filter((r) => r >= 1);
    const i = list.indexOf(rate);
    changeRate(i === -1 || i === list.length - 1 ? list[0] ?? 1 : list[i + 1]);
  };

  const toggleCaptions = () => {
    const player = playerRef.current;
    if (!player) return;
    if (captions) player.unloadModule("captions");
    else player.loadModule("captions");
    setCaptions(!captions);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frameRef.current?.requestFullscreen();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.key === "k" || (event.key === " " && target === event.currentTarget)) {
      event.preventDefault();
      togglePlay();
    }
  };

  // Timestamp chips in the lesson discussion ask the player to jump to a second.
  const seekRequestRef = useRef<(seconds: number) => void>(() => {});
  useEffect(() => {
    seekRequestRef.current = (seconds: number) => {
      const player = playerRef.current;
      if (!player || !ready) {
        playRequested.current = true;
        resumeAtRef.current = seconds;
        return;
      }
      seek(seconds);
      hasPlayed.current = true;
      player.playVideo();
    };
  });
  useEffect(() => {
    const onSeek = (event: Event) => {
      const detail = (event as CustomEvent<SeekRequest>).detail;
      if (!detail || detail.handled) return;
      detail.handled = true;
      seekRequestRef.current(detail.seconds);
      frameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(SEEK_EVENT, onSeek);
    return () => window.removeEventListener(SEEK_EVENT, onSeek);
  }, []);

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div
      ref={frameRef}
      role="region"
      aria-label={`Video player: ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={revealControls}
      onFocus={revealControls}
      className={cn(
        "group/player relative isolate aspect-video w-full overflow-hidden rounded-lg bg-black outline-none [clip-path:inset(0_round_var(--radius-lg))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400",
        fullscreen && "rounded-none [clip-path:none]",
        playing && !showControls && "cursor-none",
      )}
    >
      {/* YouTube's iframe is mounted here */}
      <div ref={hostRef} className="absolute inset-0 rounded-[inherit] [&>iframe]:size-full [&>iframe]:rounded-[inherit] [&>iframe]:border-0" />

      {/* Click layer: toggles play and keeps YouTube's own overlays out of the way */}
      {!error && (
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      {/* Poster with chips and a big play button until the first play */}
      {!posterGone && !error && (
        <VideoPoster
          poster={poster}
          title={title}
          instructor={instructor}
          start={start}
          onPlay={togglePlay}
          loading={loading}
          leaving={started}
        />
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black p-6 text-center">
          <p className="text-heading-3 text-foreground">{error}</p>
          <p className="text-body text-muted">The lesson notes and resources below are still available.</p>
        </div>
      )}

      {/* Control bar, from the first play on */}
      {started && !error && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/90 via-black/50 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300 sm:px-5 sm:pb-4",
            showControls ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-2">
            <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              <ControlIcon name={playing ? "pause" : "play"} label={playing ? "Pause" : "Play"} />
            </ControlButton>
            <ControlButton label="Back 10 seconds" onClick={() => seek(current - 10)}>
              <ControlIcon name="rewind-10" label="-10s" />
            </ControlButton>
            <span className="mr-auto ml-1 shrink-0 text-small text-white/90 tabular-nums sm:mr-0 sm:text-body">
              {formatClock(current)} / {formatClock(duration)}
            </span>

            <input
              type="range"
              aria-label="Seek"
              aria-valuetext={`${formatClock(current)} of ${formatClock(duration)}`}
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(current, duration || current)}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={!ready}
              className="order-first mb-2 h-1 min-w-0 flex-1 basis-full cursor-pointer appearance-none rounded-full bg-white/25 sm:order-0 sm:mx-3 sm:mb-0 sm:basis-auto [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              style={{
                background: `linear-gradient(to right, var(--color-primary-500) ${pct}%, rgb(255 255 255 / 0.25) ${pct}%)`,
              }}
            />

            <ControlButton label={`Playback speed ${rate}x`} onClick={cycleRate}>
              <span className="text-body font-medium tabular-nums">{rate}x</span>
            </ControlButton>
            <ControlButton label="Captions" onClick={toggleCaptions} pressed={captions}>
              <ControlIcon name="closed-caption" label="CC" />
            </ControlButton>
            <div className="relative hidden sm:block">
              <ControlButton
                label="Settings"
                onClick={() => setSettingsOpen((open) => !open)}
                pressed={settingsOpen}
              >
                <ControlIcon name="settings" label="Set" />
              </ControlButton>
              {settingsOpen && (
                <div
                  role="menu"
                  aria-label="Playback speed"
                  className="absolute right-0 bottom-11 w-36 rounded-md border border-white/10 bg-neutral-50/95 p-1.5 shadow-lg backdrop-blur-xl"
                >
                  <p className="px-2.5 pt-1 pb-1.5 text-small text-subtle">Playback speed</p>
                  {rates.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitemradio"
                      aria-checked={r === rate}
                      onClick={() => {
                        changeRate(r);
                        setSettingsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-body text-foreground hover:bg-neutral-100",
                        r === rate && "text-primary-400",
                      )}
                    >
                      {r === 1 ? "Normal" : `${r}x`}
                      {r === rate && <span aria-hidden>•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ControlButton
              label={fullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
            >
              <ControlIcon
                name={fullscreen ? "minimize" : "maximize"}
                label={fullscreen ? "Exit" : "Full"}
              />
            </ControlButton>
          </div>
        </div>
      )}
    </div>
  );
}
