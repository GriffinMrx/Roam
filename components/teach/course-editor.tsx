"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CARD_BUTTON,
  CARD_BUTTON_DANGER,
  CARD_BUTTON_GHOST,
  CARD_BUTTON_PRIMARY,
  FIELD_ERROR,
  FIELD_HINT,
  FIELD_LABEL,
  INPUT,
  INPUT_BARE,
  TEXTAREA,
} from "@/components/settings/styles";
import { CourseStatusBadge } from "@/components/teach/course-status";
import { cn } from "@/lib/cn";
import {
  CourseInput,
  LEVELS,
  LIMITS,
  RESOURCE_TYPES,
  submitProblems,
  type CourseDraft,
  type CourseStatus,
  type ResourceDraft,
} from "@/lib/teach/schema";
import { parseVideoUrl, youtubeThumbnail } from "@/lib/video";

/*
 * The teacher's course editor (prompts/teachers-phase-1.md). The whole course is edited in
 * memory and saved in one PUT /api/teach/courses/[id]; the page then reloads it from the
 * server (new modules and lessons get their ids). Submit sends it for admin review.
 */

type EditorLesson = {
  uid: string;
  id?: string;
  title: string;
  summary: string;
  videoUrl: string;
  /** "m:ss" or "h:mm:ss", as typed. */
  duration: string;
  freePreview: boolean;
  /** Paragraphs separated by a blank line. */
  notesText: string;
  /** One key point per line. */
  keyPointsText: string;
  proTip: string;
  resources: ResourceDraft[];
};
type EditorModule = { uid: string; id?: string; title: string; summary: string; lessons: EditorLesson[]; open: boolean };
type EditorState = Omit<CourseDraft, "modules"> & { modules: EditorModule[] };

export type EditorCourse = CourseDraft & {
  id: string;
  slug: string;
  status: CourseStatus;
  reviewNote: string | null;
  lessonSlugs: Record<string, string>;
};

let uidCounter = 0;
const uid = () => `n${++uidCounter}`;

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "12:34" / "1:02:03" / "45" (seconds) → seconds; NaN when unreadable. */
function parseDuration(text: string) {
  const t = text.trim();
  if (!t) return 0;
  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(t)) return Number.NaN;
  return t.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

const splitParagraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const splitLines = (text: string) => text.split("\n").map((p) => p.trim()).filter(Boolean);

function toEditor(course: EditorCourse): EditorState {
  return {
    title: course.title,
    summary: course.summary,
    level: course.level,
    price: course.price,
    categorySlug: course.categorySlug,
    modules: course.modules.map((m, i) => ({
      uid: uid(),
      id: m.id,
      title: m.title,
      summary: m.summary,
      open: i === 0,
      lessons: m.lessons.map((l) => ({
        uid: uid(),
        id: l.id,
        title: l.title,
        summary: l.summary,
        videoUrl: l.videoUrl,
        duration: formatDuration(l.durationSeconds),
        freePreview: l.freePreview,
        notesText: l.notes.join("\n\n"),
        keyPointsText: l.keyPoints.join("\n"),
        proTip: l.proTip,
        resources: l.resources,
      })),
    })),
  };
}

function toDraft(state: EditorState): CourseDraft {
  return {
    title: state.title.trim(),
    summary: state.summary.trim(),
    level: state.level,
    price: state.price,
    categorySlug: state.categorySlug,
    modules: state.modules.map((m) => ({
      ...(m.id ? { id: m.id } : {}),
      title: m.title.trim(),
      summary: m.summary.trim(),
      lessons: m.lessons.map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        title: l.title.trim(),
        summary: l.summary.trim(),
        videoUrl: l.videoUrl.trim(),
        durationSeconds: parseDuration(l.duration),
        freePreview: l.freePreview,
        notes: splitParagraphs(l.notesText),
        keyPoints: splitLines(l.keyPointsText),
        proTip: l.proTip.trim(),
        resources: l.resources.map((r) => ({ ...r, title: r.title.trim(), description: r.description.trim(), url: r.url.trim() })),
      })),
    })),
  };
}

function newLesson(): EditorLesson {
  return {
    uid: uid(),
    title: "",
    summary: "",
    videoUrl: "",
    duration: "",
    freePreview: false,
    notesText: "",
    keyPointsText: "",
    proTip: "",
    resources: [],
  };
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Same JSON body the server would get, for problem messages with a readable location. */
function issueMessage(draft: CourseDraft) {
  for (const [mi, m] of draft.modules.entries()) {
    for (const [li, l] of m.lessons.entries()) {
      if (Number.isNaN(l.durationSeconds)) return `Lesson ${mi + 1}.${li + 1}: write the length as minutes:seconds, e.g. 12:30.`;
    }
  }
  const parsed = CourseInput.safeParse(draft);
  if (parsed.success) return null;
  const issue = parsed.error.issues[0];
  const path = issue.path;
  const where =
    path[0] === "modules" && typeof path[1] === "number"
      ? path[2] === "lessons" && typeof path[3] === "number"
        ? `Lesson ${path[1] + 1}.${path[3] + 1}: `
        : `Module ${path[1] + 1}: `
      : "";
  return `${where}${issue.message}`;
}

const ICON_BUTTON =
  "inline-flex size-8 items-center justify-center rounded-[6px] text-muted transition-colors hover:bg-neutral-200 hover:text-foreground disabled:opacity-30";

export function CourseEditor({ course, categories }: { course: EditorCourse; categories: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [initial] = useState(() => toEditor(course));
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<null | "save" | "submit" | "delete">(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [armedDelete, setArmedDelete] = useState(false);

  const draft = useMemo(() => toDraft(state), [state]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(initial)), [draft, initial]);
  const problems = useMemo(() => submitProblems(draft), [draft]);
  const invalid = issueMessage(draft);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!armedDelete) return;
    const timer = setTimeout(() => setArmedDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [armedDelete]);

  const updateModule = (mi: number, changes: Partial<EditorModule>) =>
    setState((s) => ({ ...s, modules: s.modules.map((m, i) => (i === mi ? { ...m, ...changes } : m)) }));
  const updateLesson = (mi: number, li: number, changes: Partial<EditorLesson>) =>
    setState((s) => ({
      ...s,
      modules: s.modules.map((m, i) =>
        i === mi ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...changes } : l)) } : m,
      ),
    }));

  const request = async (path: string, method: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Something went wrong.");
  };

  const save = async () => {
    if (invalid) {
      setMessage({ kind: "error", text: invalid });
      return false;
    }
    await request(`/api/teach/courses/${course.id}`, "PUT", draft);
    return true;
  };

  const run = async (kind: "save" | "submit" | "delete") => {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "delete") {
        await request(`/api/teach/courses/${course.id}`, "DELETE");
        router.push("/settings?tab=courses");
        return;
      }
      if (!(await save())) return;
      if (kind === "submit") await request(`/api/teach/courses/${course.id}/submit`, "POST");
      setMessage({ kind: "ok", text: kind === "submit" ? "Submitted. An admin will review it soon." : "Saved." });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const live = course.status === "published";
  const canSubmit = !live && course.status !== "pending" && problems.length === 0 && !invalid;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Header card: title, status, actions */}
      <section className="rounded-sm bg-neutral-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/settings?tab=courses" className="text-small text-muted transition-colors hover:text-foreground">
              ← My courses
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-heading-1 break-words text-foreground">{state.title || "Untitled course"}</h2>
              <CourseStatusBadge status={course.status} />
            </div>
            <p className="mt-0.5 text-small text-muted">
              {live
                ? "Live. Your edits go live as soon as you save."
                : course.status === "pending"
                  ? "In review. You can keep editing; an admin will approve or send it back with a note."
                  : "Draft. Save as often as you like, then submit it for review."}
            </p>
            {course.status === "rejected" && course.reviewNote && (
              <p className="mt-3 max-w-xl rounded-[6px] bg-red-500/10 p-3 text-small text-red-200 light:text-red-800">
                <span className="font-semibold">Review note:</span> {course.reviewNote}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {live && (
              <Link href={`/courses/${course.slug}`} className={CARD_BUTTON_GHOST}>
                View live
              </Link>
            )}
            <button type="button" onClick={() => run("save")} disabled={busy !== null || !dirty} className={CARD_BUTTON}>
              {busy === "save" ? "Saving…" : live ? "Save changes" : "Save draft"}
            </button>
            {!live && (
              <button
                type="button"
                onClick={() => run("submit")}
                disabled={busy !== null || !canSubmit}
                title={problems[0]}
                className={CARD_BUTTON_PRIMARY}
              >
                {busy === "submit" ? "Submitting…" : course.status === "pending" ? "In review" : "Submit for review"}
              </button>
            )}
          </div>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-body">
          {message?.kind === "ok" && <span className="text-soft">{message.text}</span>}
          {message?.kind === "error" && <span className={FIELD_ERROR}>{message.text}</span>}
          {!message && dirty && <span className="text-small text-subtle">Unsaved changes</span>}
        </p>
        {!live && course.status !== "pending" && problems.length > 0 && (
          <details className="mt-1 text-small text-muted">
            <summary className="cursor-pointer select-none">Before you can submit ({problems.length})</summary>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {problems.slice(0, 12).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Course details */}
      <section className="rounded-sm bg-neutral-100 p-5">
        <h3 className="text-heading-3 text-foreground">Course details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="c-title" className={FIELD_LABEL}>
              Title
            </label>
            <input
              id="c-title"
              maxLength={120}
              value={state.title}
              onChange={(e) => setState({ ...state, title: e.target.value })}
              className={INPUT}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="c-summary" className={FIELD_LABEL}>
              Summary
            </label>
            <textarea
              id="c-summary"
              rows={2}
              maxLength={240}
              value={state.summary}
              onChange={(e) => setState({ ...state, summary: e.target.value })}
              placeholder="One or two sentences on what learners will get out of it."
              className={TEXTAREA}
            />
            <p className={FIELD_HINT}>{state.summary.length}/240</p>
          </div>
          <div>
            <label htmlFor="c-category" className={FIELD_LABEL}>
              Category
            </label>
            <select
              id="c-category"
              value={state.categorySlug ?? ""}
              onChange={(e) => setState({ ...state, categorySlug: e.target.value || null })}
              className={INPUT}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-level" className={FIELD_LABEL}>
                Level
              </label>
              <select
                id="c-level"
                value={state.level}
                onChange={(e) => setState({ ...state, level: e.target.value as CourseDraft["level"] })}
                className={INPUT}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-price" className={FIELD_LABEL}>
                Price (USD)
              </label>
              <input
                id="c-price"
                type="number"
                min={0}
                max={10000}
                step={1}
                value={state.price}
                onChange={(e) => setState({ ...state, price: Math.max(0, Math.min(10000, Math.round(Number(e.target.value) || 0))) })}
                className={INPUT}
              />
              <p className={FIELD_HINT}>0 is free. Display only for now.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules and lessons */}
      <section className="rounded-sm bg-neutral-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-heading-3 text-foreground">Modules and lessons</h3>
            <p className="text-small text-muted">Each lesson is a video link (YouTube, Vimeo, or Bunny) plus its notes.</p>
          </div>
          <button
            type="button"
            disabled={state.modules.length >= LIMITS.modules}
            onClick={() =>
              setState((s) => ({
                ...s,
                modules: [...s.modules, { uid: uid(), title: "", summary: "", open: true, lessons: [newLesson()] }],
              }))
            }
            className={CARD_BUTTON}
          >
            + Add module
          </button>
        </div>

        {state.modules.length === 0 && <p className="mt-4 text-body text-muted">No modules yet. Add the first one.</p>}

        <ol className="mt-4 flex flex-col gap-3">
          {state.modules.map((m, mi) => (
            <li key={m.uid} className="rounded-[6px] border border-border bg-neutral-50">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => updateModule(mi, { open: !m.open })}
                  aria-expanded={m.open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span aria-hidden className={cn("text-muted transition-transform", m.open && "rotate-90")}>
                    ▸
                  </span>
                  <span className="truncate text-body font-medium text-foreground">
                    Module {mi + 1}
                    {m.title ? ` · ${m.title}` : ""}
                  </span>
                  <span className="shrink-0 text-small text-subtle">
                    {m.lessons.length} {m.lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </button>
                <button type="button" aria-label="Move module up" disabled={mi === 0} onClick={() => setState((s) => ({ ...s, modules: move(s.modules, mi, mi - 1) }))} className={ICON_BUTTON}>
                  ↑
                </button>
                <button type="button" aria-label="Move module down" disabled={mi === state.modules.length - 1} onClick={() => setState((s) => ({ ...s, modules: move(s.modules, mi, mi + 1) }))} className={ICON_BUTTON}>
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Delete module"
                  onClick={() => {
                    if (m.lessons.length === 0 || window.confirm(`Delete Module ${mi + 1} and its ${m.lessons.length} lessons? Their discussions are deleted when you save.`)) {
                      setState((s) => ({ ...s, modules: s.modules.filter((_, i) => i !== mi) }));
                    }
                  }}
                  className={ICON_BUTTON}
                >
                  ✕
                </button>
              </div>

              {m.open && (
                <div className="border-t border-border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${m.uid}-title`} className={FIELD_LABEL}>
                        Module title
                      </label>
                      <input id={`${m.uid}-title`} maxLength={120} value={m.title} onChange={(e) => updateModule(mi, { title: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label htmlFor={`${m.uid}-summary`} className={FIELD_LABEL}>
                        Module summary
                      </label>
                      <input id={`${m.uid}-summary`} maxLength={240} value={m.summary} onChange={(e) => updateModule(mi, { summary: e.target.value })} className={INPUT} />
                    </div>
                  </div>

                  <ol className="mt-4 flex flex-col gap-3">
                    {m.lessons.map((l, li) => (
                      <LessonEditor
                        key={l.uid}
                        lesson={l}
                        label={`Lesson ${mi + 1}.${li + 1}`}
                        liveSlug={live && l.id ? course.lessonSlugs[l.id] : undefined}
                        first={li === 0}
                        last={li === m.lessons.length - 1}
                        onChange={(changes) => updateLesson(mi, li, changes)}
                        onMove={(to) => updateModule(mi, { lessons: move(m.lessons, li, li + to) })}
                        onDelete={() => {
                          if (!l.id || window.confirm(`Delete ${l.title || "this lesson"}? Its discussion is deleted when you save.`)) {
                            updateModule(mi, { lessons: m.lessons.filter((_, j) => j !== li) });
                          }
                        }}
                      />
                    ))}
                  </ol>
                  <button
                    type="button"
                    disabled={m.lessons.length >= LIMITS.lessonsPerModule}
                    onClick={() => updateModule(mi, { lessons: [...m.lessons, newLesson()] })}
                    className={cn(CARD_BUTTON, "mt-3")}
                  >
                    + Add lesson
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Danger zone */}
      <section className="rounded-sm bg-neutral-100 p-5">
        <h3 className="text-heading-3 text-foreground">Delete course</h3>
        <p className="mt-0.5 text-small text-muted">Removes the course, its lessons, and every comment on them. This can&rsquo;t be undone.</p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => (armedDelete ? run("delete") : setArmedDelete(true))}
          className={cn(armedDelete ? CARD_BUTTON_DANGER : CARD_BUTTON, "mt-4")}
        >
          {busy === "delete" ? "Deleting…" : armedDelete ? "Confirm delete" : "Delete course"}
        </button>
      </section>
    </div>
  );
}

function LessonEditor({
  lesson: l,
  label,
  liveSlug,
  first,
  last,
  onChange,
  onMove,
  onDelete,
}: {
  lesson: EditorLesson;
  label: string;
  liveSlug?: string;
  first: boolean;
  last: boolean;
  onChange: (changes: Partial<EditorLesson>) => void;
  onMove: (by: number) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!l.id);
  const video = l.videoUrl.trim() ? parseVideoUrl(l.videoUrl.trim()) : null;
  const videoError = l.videoUrl.trim() !== "" && !video;
  const durationError = Number.isNaN(parseDuration(l.duration));
  const id = l.uid;

  return (
    <li className="rounded-[6px] border border-border bg-neutral-100">
      <div className="flex items-center gap-2 p-2.5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span aria-hidden className={cn("text-muted transition-transform", open && "rotate-90")}>
            ▸
          </span>
          <span className="shrink-0 text-small text-subtle">{label}</span>
          <span className="truncate text-body text-foreground">{l.title || "Untitled lesson"}</span>
          {l.freePreview && <span className="shrink-0 text-small text-primary-400">Free preview</span>}
        </button>
        {liveSlug && (
          <Link href={`/lessons/${liveSlug}`} className="shrink-0 text-small text-muted transition-colors hover:text-foreground">
            View
          </Link>
        )}
        <button type="button" aria-label="Move lesson up" disabled={first} onClick={() => onMove(-1)} className={ICON_BUTTON}>
          ↑
        </button>
        <button type="button" aria-label="Move lesson down" disabled={last} onClick={() => onMove(1)} className={ICON_BUTTON}>
          ↓
        </button>
        <button type="button" aria-label="Delete lesson" onClick={onDelete} className={ICON_BUTTON}>
          ✕
        </button>
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-title`} className={FIELD_LABEL}>
              Lesson title
            </label>
            <input id={`${id}-title`} maxLength={120} value={l.title} onChange={(e) => onChange({ title: e.target.value })} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-summary`} className={FIELD_LABEL}>
              Short description
            </label>
            <input id={`${id}-summary`} maxLength={240} value={l.summary} onChange={(e) => onChange({ summary: e.target.value })} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-video`} className={FIELD_LABEL}>
              Video link
            </label>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <input
                  id={`${id}-video`}
                  inputMode="url"
                  maxLength={500}
                  value={l.videoUrl}
                  onChange={(e) => onChange({ videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                  aria-invalid={videoError}
                  className={INPUT}
                />
                {videoError ? (
                  <p className={FIELD_ERROR}>Paste a YouTube, Vimeo, or Bunny video link.</p>
                ) : video ? (
                  <p className={FIELD_HINT}>{video.provider === "youtube" ? "YouTube" : video.provider === "vimeo" ? "Vimeo" : "Bunny"} video ✓</p>
                ) : (
                  <p className={FIELD_HINT}>The video plays on Roam with its own player.</p>
                )}
              </div>
              {video?.provider === "youtube" && (
                <span className="relative mt-1.5 hidden aspect-video w-32 shrink-0 overflow-hidden rounded-[6px] bg-black sm:block">
                  <Image src={youtubeThumbnail(video.id)} alt="" fill sizes="128px" className="object-cover" />
                </span>
              )}
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-duration`} className={FIELD_LABEL}>
              Video length
            </label>
            <input
              id={`${id}-duration`}
              value={l.duration}
              onChange={(e) => onChange({ duration: e.target.value })}
              placeholder="12:30"
              aria-invalid={durationError}
              className={INPUT}
            />
            {durationError ? <p className={FIELD_ERROR}>Use minutes:seconds, e.g. 12:30.</p> : <p className={FIELD_HINT}>minutes:seconds</p>}
          </div>
          <label className="flex items-center gap-2 self-center pt-5 text-[13px] text-foreground">
            <input type="checkbox" checked={l.freePreview} onChange={(e) => onChange({ freePreview: e.target.checked })} className="size-4 accent-primary-500" />
            Free preview (watchable without signing in)
          </label>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-points`} className={FIELD_LABEL}>
              Key points
            </label>
            <textarea
              id={`${id}-points`}
              rows={3}
              value={l.keyPointsText}
              onChange={(e) => onChange({ keyPointsText: e.target.value })}
              placeholder={"One per line (up to 6)\nKeep your elbows tucked\nBrace your core"}
              className={TEXTAREA}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-notes`} className={FIELD_LABEL}>
              Notes
            </label>
            <textarea
              id={`${id}-notes`}
              rows={5}
              value={l.notesText}
              onChange={(e) => onChange({ notesText: e.target.value })}
              placeholder="What the lesson covers. Leave a blank line between paragraphs."
              className={TEXTAREA}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-tip`} className={FIELD_LABEL}>
              Pro tip <span className="font-normal text-subtle">(optional)</span>
            </label>
            <input id={`${id}-tip`} maxLength={500} value={l.proTip} onChange={(e) => onChange({ proTip: e.target.value })} className={INPUT} />
          </div>
          <ResourcesEditor resources={l.resources} onChange={(resources) => onChange({ resources })} idPrefix={id} />
        </div>
      )}
    </li>
  );
}

function ResourcesEditor({
  resources,
  onChange,
  idPrefix,
}: {
  resources: ResourceDraft[];
  onChange: (resources: ResourceDraft[]) => void;
  idPrefix: string;
}) {
  const update = (i: number, changes: Partial<ResourceDraft>) => onChange(resources.map((r, j) => (j === i ? { ...r, ...changes } : r)));
  return (
    <div className="sm:col-span-2">
      <p className={FIELD_LABEL}>
        Resources <span className="font-normal text-subtle">(optional links)</span>
      </p>
      <ul className="mt-1.5 flex flex-col gap-2">
        {resources.map((r, i) => (
          <li key={i} className="grid gap-2 rounded-[6px] border border-border p-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
            <select aria-label="Resource type" value={r.type} onChange={(e) => update(i, { type: e.target.value as ResourceDraft["type"] })} className={INPUT_BARE}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input id={`${idPrefix}-r${i}-title`} aria-label="Resource title" maxLength={120} value={r.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Title" className={INPUT_BARE} />
            <input aria-label="Resource link" inputMode="url" maxLength={500} value={r.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://…" className={INPUT_BARE} />
            <button type="button" aria-label="Remove resource" onClick={() => onChange(resources.filter((_, j) => j !== i))} className={ICON_BUTTON}>
              ✕
            </button>
            <input aria-label="Resource description" maxLength={240} value={r.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Short description (optional)" className={cn(INPUT_BARE, "sm:col-span-4")} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={resources.length >= LIMITS.resources}
        onClick={() => onChange([...resources, { type: "link", title: "", description: "", url: "" }])}
        className={cn(CARD_BUTTON_GHOST, "mt-2")}
      >
        + Add resource
      </button>
    </div>
  );
}
