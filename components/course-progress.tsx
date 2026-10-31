"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  completedLessonIds,
  completedModuleKeys,
  coursePercent,
  EMPTY_PROGRESS,
  isComplete,
  resumeTarget,
  type CourseProgress,
  type ResumeTarget,
} from "@/lib/progress";

export type CourseShape = { modules: { key: string; lessonIds: string[] }[] };

type Report = { lessonId: string; position: number; duration: number; ended?: boolean; keepalive?: boolean };

type CourseProgressValue = {
  /** "loading" until Clerk and the progress request settle. */
  status: "loading" | "signed-out" | "ready";
  progress: CourseProgress;
  doneLessons: Set<string>;
  doneModules: Set<string>;
  percent: number;
  /** Where Start / Continue / Review Course should go. */
  target: ResumeTarget;
  /** Updates the UI immediately (optimistic), then saves through POST /api/progress. */
  report: (report: Report) => void;
};

const CourseProgressContext = createContext<CourseProgressValue | null>(null);

/**
 * The signed-in learner's progress for one course, on the course and lesson pages.
 * Pages stay static and cached; this loads progress from GET /api/progress (Clerk
 * session, server route) after the page renders. The player reports watch progress
 * here, checks and % update at once, and the route persists it. The browser never
 * talks to Sanity or holds a token (AGENTS §5).
 */
export function CourseProgressProvider({
  courseId,
  course,
  children,
}: {
  courseId: string;
  course: CourseShape;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [progress, setProgress] = useState<CourseProgress>(EMPTY_PROGRESS);
  const [fetched, setFetched] = useState(false);
  const signedInRef = useRef(false);

  useEffect(() => {
    signedInRef.current = Boolean(isSignedIn);
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    fetch(`/api/progress?courseId=${encodeURIComponent(courseId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<CourseProgress>) : null))
      .then((server) => {
        if (cancelled) return;
        if (server) {
          // Anything reported locally before the response arrived wins (and stays complete).
          setProgress((local) => {
            const lessons = { ...server.lessons };
            for (const [id, entry] of Object.entries(local.lessons)) {
              lessons[id] = { ...entry, completed: entry.completed || Boolean(server.lessons[id]?.completed) };
            }
            return {
              lessons,
              lastLessonId: local.lastLessonId ?? server.lastLessonId,
              lastPosition: local.lastLessonId ? local.lastPosition : server.lastPosition,
            };
          });
        }
        setFetched(true);
      })
      .catch(() => !cancelled && setFetched(true));
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, courseId]);

  const report = useCallback(({ lessonId, position, duration, ended, keepalive }: Report) => {
    if (!(duration > 0)) return;
    const pos = Math.min(Math.max(0, position), duration);

    setProgress((current) => ({
      lessons: {
        ...current.lessons,
        [lessonId]: {
          position: pos,
          duration,
          completed: Boolean(current.lessons[lessonId]?.completed) || isComplete(pos, duration, ended),
        },
      },
      lastLessonId: lessonId,
      lastPosition: pos,
    }));

    if (!signedInRef.current) return;
    // Persist. Failures keep the local state; the next report (every ~10s) retries.
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId, position: pos, duration, ended: Boolean(ended) }),
      keepalive: keepalive ?? false,
    }).catch(() => {});
  }, []);

  const status: CourseProgressValue["status"] = !isLoaded
    ? "loading"
    : !isSignedIn
      ? "signed-out"
      : fetched
        ? "ready"
        : "loading";

  const value = useMemo(() => {
    const doneLessons = completedLessonIds(progress);
    return {
      status,
      progress,
      doneLessons,
      doneModules: completedModuleKeys(course, doneLessons),
      percent: coursePercent(course, doneLessons),
      target: resumeTarget(course, status === "ready" ? progress : null),
      report,
    };
  }, [status, progress, course, report]);

  return <CourseProgressContext.Provider value={value}>{children}</CourseProgressContext.Provider>;
}

/** Progress for the current course, or null outside a CourseProgressProvider. */
export function useCourseProgress() {
  return useContext(CourseProgressContext);
}
