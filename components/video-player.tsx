"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useCourseProgress } from "@/components/course-progress";
import { MaybeIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isComplete, savedStart } from "@/lib/progress";
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

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiReady;
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

export function VideoPlayer({
  source,
  start = 0,
  title,
  poster,
  durationHint = 0,
  lessonId,
  resume = false,
}: {
  source: VideoSource;
  /** Start position in seconds (from the lesson page's ?t= param). */
  start?: number;
  title: string;
  /** Poster image URL shown before the first play. */
  poster?: string;
  /** Duration from Sanity, shown until the player reports its own. */
  durationHint?: number;
  /** When set (inside a CourseProgressProvider), watch progress is reported for this lesson. */
  lessonId?: string;
  /** No explicit start time: resume the learner's saved position on first play. */
  resume?: boolean;
}) {
  if (source.provider !== "youtube") {
    return (
      <div className="relative isolate aspect-video w-full overflow-hidden rounded-lg bg-black [clip-path:inset(0_round_var(--radius-lg))]">
        <iframe
          src={embedUrl(source, start)}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <YouTubePlayer
      id={source.id}
      start={start}
      title={title}
      poster={poster}
      durationHint={durationHint}
      lessonId={lessonId}
      resume={resume}
    />
  );
}

function YouTubePlayer({
  id,
  start,
  title,
  poster,
  durationHint,
  lessonId,
  resume,
}: {
  id: string;
  start: number;
  title: string;
  poster?: string;
  durationHint: number;
  lessonId?: string;
  resume?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          },
          onStateChange: (e: YTEvent) => {
            if (cancelled) return;
            setPlaying(e.data === PLAYING);
            if (e.data === PLAYING) {
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

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (playing) return player.pauseVideo();
    // First play with no ?t=: pick up where the learner left off.
    if (!hasPlayed.current && resumeAt > 0) {
      player.seekTo(resumeAt, true);
      setCurrent(resumeAt);
    }
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

      {/* Poster with a big play button until the first play */}
      {!started && !error && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black">
          {poster && (
            <Image src={poster} alt="" fill preload sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-70" />
          )}
          <span className="relative flex size-18 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
            <ControlIcon name="play" label="Play" size={32} />
          </span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black p-6 text-center">
          <p className="text-heading-3 text-foreground">{error}</p>
          <p className="text-body text-muted">The lesson notes and resources below are still available.</p>
        </div>
      )}

      {/* Control bar */}
      {!error && (
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
              className="order-first mb-2 h-1 min-w-0 flex-1 basis-full cursor-pointer appearance-none rounded-full bg-white/25 sm:order-none sm:mx-3 sm:mb-0 sm:basis-auto [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
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
