/*
 * Pure helpers for learner progress. Safe on server and client (no data access).
 * A lesson is complete at >= 90% watched (or when the player reports the end).
 */

export const COMPLETE_RATIO = 0.9;

export type LessonProgress = { position: number; duration: number; completed: boolean };

export type CourseProgress = {
  /** lessonId → progress */
  lessons: Record<string, LessonProgress>;
  lastLessonId: string | null;
  lastPosition: number;
};

export const EMPTY_PROGRESS: CourseProgress = { lessons: {}, lastLessonId: null, lastPosition: 0 };

/** Document id for one learner's progress in one course: progress.<userId>.<courseKey>. */
export function progressDocId(userId: string, courseId: string) {
  return `progress.${userId}.${courseId.replace(/^course\./, "")}`;
}

export function isComplete(position: number, duration: number, ended = false) {
  return ended || (duration > 0 && position / duration >= COMPLETE_RATIO);
}

type CourseShape = { modules: { key: string; lessonIds: string[] }[] };

export function completedLessonIds(progress: CourseProgress) {
  return new Set(Object.entries(progress.lessons).filter(([, l]) => l.completed).map(([id]) => id));
}

/** Module keys whose every lesson is complete. */
export function completedModuleKeys(course: CourseShape, done: Set<string>) {
  return new Set(
    course.modules.filter((m) => m.lessonIds.length > 0 && m.lessonIds.every((id) => done.has(id))).map((m) => m.key),
  );
}

export function coursePercent(course: CourseShape, done: Set<string>) {
  const all = course.modules.flatMap((m) => m.lessonIds);
  if (!all.length) return 0;
  return Math.round((all.filter((id) => done.has(id)).length / all.length) * 100);
}

export type ResumeTarget = {
  state: "start" | "continue" | "review";
  lessonId: string | null;
  /** Seconds to start at; 0 for a fresh start. */
  position: number;
};

/**
 * Where "Start/Continue Learning" goes: the last-watched lesson at its saved second if
 * unfinished; else the first incomplete lesson in course order; else (all done) the first.
 */
export function resumeTarget(course: CourseShape, progress: CourseProgress | null): ResumeTarget {
  const order = course.modules.flatMap((m) => m.lessonIds);
  const first = order[0] ?? null;
  if (!progress || Object.keys(progress.lessons).length === 0) return { state: "start", lessonId: first, position: 0 };

  const done = completedLessonIds(progress);
  if (order.length > 0 && order.every((id) => done.has(id))) return { state: "review", lessonId: first, position: 0 };

  const last = progress.lastLessonId;
  if (last && order.includes(last) && !done.has(last)) {
    return { state: "continue", lessonId: last, position: Math.floor(progress.lessons[last]?.position ?? progress.lastPosition) };
  }
  return { state: "continue", lessonId: order.find((id) => !done.has(id)) ?? first, position: 0 };
}

/** Saved second to resume a lesson at, unless it's finished (then from the start). */
export function savedStart(progress: CourseProgress | null, lessonId: string) {
  const entry = progress?.lessons[lessonId];
  if (!entry || entry.completed) return 0;
  return Math.floor(entry.position);
}
