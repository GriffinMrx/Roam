"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

/*
 * Save / unsave a course or lesson. State comes from GET /api/bookmarks and changes go
 * through POST /api/bookmarks (Clerk session, server write); the browser never writes
 * to Sanity (AGENTS §5). Signed out, the button opens sign-in instead.
 *
 * Every button and the catalog's Saved view share one store, so saving or unsaving
 * anywhere updates everywhere at once.
 */

/* ---------- Shared store ---------- */

let saved = new Set<string>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const EMPTY = new Set<string>();

function emit(next: Set<string>) {
  saved = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** One GET per page load (signed in), shared by every subscriber. */
function load() {
  loading ??= fetch("/api/bookmarks", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<{ ids: string[] }>) : { ids: [] }))
    .then((body) => emit(new Set(body.ids)))
    .catch(() => {});
  return loading;
}

/** Saved course and lesson ids for the signed-in learner (empty when signed out). */
export function useSavedIds() {
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn]);
  const ids = useSyncExternalStore(subscribe, () => saved, () => EMPTY);
  return isSignedIn ? ids : EMPTY;
}

/** Optimistic toggle; rolls back if the server rejects it. */
async function setSaved(id: string, value: boolean) {
  const previous = saved;
  const next = new Set(saved);
  if (value) next.add(id);
  else next.delete(id);
  emit(next);
  try {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, saved: value }),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    emit(previous);
  }
}

/* ---------- Button ---------- */

export function BookmarkButton({
  id,
  variant = "full",
  className,
}: {
  /** Sanity id of the course or lesson, e.g. "course.react-basics". */
  id: string;
  /** "full": icon + Bookmark/Saved label. "icon": square icon button. "overlay": icon button over an image. */
  variant?: "full" | "icon" | "overlay";
  className?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const isSaved = useSavedIds().has(id);
  const [pending, setPending] = useState(false);
  /** Bumped on each click, so the icon swings only when the learner saves (not on load). */
  const [swings, setSwings] = useState(0);

  const toggle = async () => {
    setPending(true);
    if (!isSaved) setSwings((n) => n + 1);
    await setSaved(id, !isSaved);
    setPending(false);
  };

  // Saving swings the icon from its top with two small waves (motion-safe, clicks only).
  const ringing = swings > 0 && isSaved;
  const icon = (
    <span className="relative inline-flex">
      <span key={swings} className={cn("inline-flex origin-top", ringing && "motion-safe:animate-bookmark-swing")}>
        <Icon name="bookmark" size={20} />
      </span>
      {ringing && (
        <span key={`w${swings}`} aria-hidden className="pointer-events-none absolute inset-0 hidden motion-safe:block">
          <svg
            viewBox="0 0 14 14"
            className="absolute -top-1 right-[calc(100%-2px)] size-3 origin-bottom-right animate-bookmark-wave fill-none stroke-current opacity-0 [stroke-linecap:round] stroke-[1.6]"
          >
            <path d="M14 8a6 6 0 0 0-6 6" />
            <path d="M14 4A10 10 0 0 0 4 14" />
          </svg>
          <svg
            viewBox="0 0 14 14"
            className="absolute -top-1 left-[calc(100%-2px)] size-3 origin-bottom-left animate-bookmark-wave fill-none stroke-current opacity-0 [animation-delay:140ms] [stroke-linecap:round] stroke-[1.6]"
          >
            <path d="M0 8a6 6 0 0 1 6 6" />
            <path d="M0 4a10 10 0 0 1 10 10" />
          </svg>
        </span>
      )}
    </span>
  );

  // "full": the label crossfades Bookmark ↔ Saved (with a slight blur), like the React Bits Bell Toggle.
  const content: ReactNode =
    variant === "full" ? (
      <>
        {icon}
        <span className="inline-grid">
          <span
            aria-hidden={isSaved}
            className={cn(
              "[grid-area:1/1] transition-[opacity,filter] duration-200",
              isSaved ? "opacity-0 blur-[2px]" : "opacity-100 blur-0",
            )}
          >
            Bookmark
          </span>
          <span
            aria-hidden={!isSaved}
            className={cn(
              "[grid-area:1/1] transition-[opacity,filter] duration-200",
              isSaved ? "opacity-100 blur-0" : "opacity-0 blur-[2px]",
            )}
          >
            Saved
          </span>
        </span>
      </>
    ) : (
      icon
    );

  // Each state is a complete class list (cn() doesn't merge conflicting utilities).
  const classes =
    variant === "overlay"
      ? cn(
          "flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/55 shadow-lg backdrop-blur-md transition-colors hover:bg-black/75",
          isSaved ? "text-primary-400" : "text-white",
          className,
        )
      : variant === "icon"
        ? cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-neutral-50",
            isSaved ? "border-primary-300 bg-primary-100 text-primary-400" : "border-border text-primary-500",
            className,
          )
        : cn(
            // Same button as before; Saved takes the toggle's light style.
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border px-6 text-body-lg font-medium whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed",
            isSaved
              ? "border-[#f5f5f5] bg-[#f5f5f5] text-[#18181b] hover:bg-white light:border-gloss-to light:bg-gloss-to light:text-neutral-950 light:hover:bg-gloss-hover-to"
              : "border-border bg-surface text-foreground hover:border-neutral-300 hover:bg-neutral-50",
            className,
          );

  if (isLoaded && !isSignedIn) {
    return (
      <SignInButton>
        <button type="button" aria-label="Sign in to bookmark" className={classes}>
          {content}
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!isLoaded || pending}
      aria-pressed={isSaved}
      aria-label={variant === "full" ? undefined : isSaved ? "Remove bookmark" : "Bookmark"}
      className={classes}
    >
      {content}
    </button>
  );
}
