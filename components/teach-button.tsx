"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { Icon } from "@/components/ui";

/*
 * Navbar pill next to the bell, styled like the reference's "Create Group"
 * (prompts/onboarding-survey-review-and-phase-2.md). Signed-out visitors see nothing, learners
 * see "Become a Teacher", users with a teacher profile see "Create Course"
 * (prompts/teach-button-visibility.md). The answer comes from GET /api/teach/profile (the
 * profile row is the truth), so the header itself stays cached.
 */

/*
 * One shared answer for every mounted pill. The router keeps earlier pages alive (hidden),
 * each with its own header, so they all read and refresh from this store together.
 */
let known: { userId: string; teacher: boolean } | null = null;
let loading: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => known;
const getServerSnapshot = () => null;
const publish = (value: typeof known) => {
  known = value;
  listeners.forEach((listener) => listener());
};

function load(userId: string) {
  if (loading === userId) return;
  loading = userId;
  fetch("/api/teach/profile", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<{ teacher?: boolean }>) : null))
    .then((body) => {
      if (body) publish({ userId, teacher: body.teacher === true });
    })
    .catch(() => {})
    .finally(() => {
      if (loading === userId) loading = null;
    });
}

/** Forget the answer, e.g. right after the user becomes a teacher; mounted pills ask again. */
export function forgetTeacherStatus() {
  loading = null;
  publish(null);
}

export function TeachButton() {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = isSignedIn ? user.id : null;
  const answer = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const teacher = answer && answer.userId === userId ? answer.teacher : null;

  useEffect(() => {
    if (userId && teacher === null) load(userId);
  }, [userId, teacher]);

  if (isLoaded && !isSignedIn) return null;
  // Same footprint while loading, so the header doesn't shift.
  if (!isLoaded || teacher === null) return <span aria-hidden className="hidden h-9 w-40 sm:block" />;

  return (
    <Link
      href={teacher ? "/settings?tab=courses" : "/onboarding?role=teacher"}
      className="hidden h-9 items-center gap-2 rounded-full border border-ink/10 bg-neutral-100 px-4 text-small font-medium whitespace-nowrap text-foreground shadow-(--shadow-panel-flat) transition-colors hover:bg-neutral-200 sm:inline-flex"
    >
      <Icon name={teacher ? "square-plus" : "check-circle"} size={16} className="text-muted" />
      {teacher ? "Create Course" : "Become a Teacher"}
    </Link>
  );
}
