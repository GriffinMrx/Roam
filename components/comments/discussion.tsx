"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { buttonStyles, Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { COMMENT_MAX, REPORT_MAX, type CommentSort, type CommentView, type Thread } from "@/lib/comments-shared";
import { CommentBody } from "./comment-body";

/*
 * Lesson discussion (Neon Postgres via /api/comments). Plain-text comments with one
 * level of replies, likes, Top/Newest, edit/delete your own, report, and admin tools
 * (pin, hide, dismiss reports, delete permanently). Every permission is enforced by
 * the server; the UI only hides what a viewer can't do.
 */

const VISIBLE_REPLIES = 2;
const REPORT_REASONS = ["Spam", "Harassment or abuse", "Off-topic", "Other"];

async function api(path: string, init: { method: string; body?: unknown }) {
  const res = await fetch(path, {
    method: init.method,
    headers: init.body ? { "content-type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Something went wrong.");
  }
  return res;
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [604800, "week"],
    [2629800, "month"],
    [31557600, "year"],
  ];
  let unit = units[0];
  for (const u of units) if (seconds >= u[0]) unit = u;
  const n = Math.floor(seconds / unit[0]);
  return `${n} ${unit[1]}${n === 1 ? "" : "s"} ago`;
}

function Avatar({ comment }: { comment: CommentView }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-body font-semibold text-foreground ring-1 ring-ink/10">
      {comment.authorImage ? (
        <Image src={comment.authorImage} alt="" fill sizes="36px" className="object-cover" unoptimized />
      ) : (
        comment.authorName.charAt(0).toUpperCase()
      )}
    </span>
  );
}

function Composer({
  placeholder,
  initial = "",
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || trimmed.length > COMMENT_MAX) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setBody("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        rows={3}
        maxLength={COMMENT_MAX}
        className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-body text-foreground outline-none placeholder:text-subtle focus:border-primary-400"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !trimmed}
          className={buttonStyles({ variant: "glossy", size: "md", className: "disabled:opacity-50" })}
        >
          {busy ? "Posting…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-body text-muted hover:text-foreground">
            Cancel
          </button>
        )}
        <span className={cn("ml-auto text-small tabular-nums", body.length > COMMENT_MAX - 100 ? "text-soft" : "text-subtle")}>
          {body.length}/{COMMENT_MAX}
        </span>
      </div>
      {error && <p className="mt-2 text-body text-red-300">{error}</p>}
    </form>
  );
}

function ActionButton({
  onClick,
  children,
  active,
  danger,
  disabled,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-medium transition-colors disabled:opacity-50",
        danger
          ? "text-red-300 hover:bg-red-500/15"
          : active
            ? "text-foreground hover:bg-ink/8"
            : "text-subtle hover:bg-ink/8 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function Discussion({
  lessonId,
  maxSeconds,
  onCount,
}: {
  lessonId: string;
  maxSeconds?: number;
  onCount?: (count: number) => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [sort, setSort] = useState<CommentSort>("top");
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    const res = await fetch(`/api/comments?lessonId=${encodeURIComponent(lessonId)}&sort=${sort}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(res.status === 401 ? "Sign in to read the discussion." : "Couldn't load the discussion.");
    return (await res.json()) as Thread;
  }, [lessonId, sort]);

  const apply = useCallback(
    (data: Thread) => {
      setThread(data);
      setLoadError(null);
      onCount?.(data.total);
    },
    [onCount],
  );

  /** Re-reads the thread after a change. */
  const load = useCallback(async () => {
    try {
      apply(await fetchThread());
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [apply, fetchThread]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    fetchThread()
      .then((data) => !cancelled && apply(data))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [isLoaded, fetchThread, apply]);

  const post = async (body: string, parentId?: string) => {
    await api("/api/comments", { method: "POST", body: { lessonId, body, ...(parentId ? { parentId } : {}) } });
    await load();
  };

  // Optimistic like: update locally, roll back by reloading on failure.
  const toggleLike = async (comment: CommentView) => {
    const liked = !comment.likedByMe;
    const patch = (list: CommentView[]): CommentView[] =>
      list.map((c) =>
        c.id === comment.id
          ? { ...c, likedByMe: liked, likeCount: c.likeCount + (liked ? 1 : -1) }
          : { ...c, replies: patch(c.replies) },
      );
    setThread((t) => (t ? { ...t, comments: patch(t.comments) } : t));
    try {
      await api(`/api/comments/${comment.id}/like`, { method: "POST", body: { liked } });
    } catch {
      load();
    }
  };

  const canPost = Boolean(isSignedIn);
  const isAdmin = Boolean(thread?.viewer.isAdmin);

  return (
    <div className="px-1 py-8 sm:px-4">
      {/* Composer */}
      {!isLoaded ? null : canPost ? (
        <Composer
          placeholder="Share a thought or ask a question… (mention a time like 3:12 to link the video)"
          submitLabel="Post comment"
          onSubmit={(body) => post(body)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-linear-to-b from-ink/6 to-ink/2 p-5">
          <p className="text-body text-muted">Sign in to join the discussion.</p>
          <SignInButton>
            <button type="button" className={buttonStyles({ variant: "glossy", size: "md" })}>
              Sign in
            </button>
          </SignInButton>
        </div>
      )}

      {/* Sort */}
      {thread && thread.comments.length > 0 && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-body text-muted">
            {thread.total} {thread.total === 1 ? "comment" : "comments"}
          </p>
          <div role="radiogroup" aria-label="Sort comments" className="flex gap-2">
            {(["top", "new"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sort === s}
                onClick={() => setSort(s)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-small font-medium transition-colors",
                  sort === s
                    ? "bg-linear-to-b from-gloss-from to-gloss-to text-neutral-950 shadow-(--shadow-pill-flat)"
                    : "bg-ink/6 text-soft ring-1 ring-ink/10 ring-inset hover:bg-ink/10",
                )}
              >
                {s === "top" ? "Top" : "Newest"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-6">
        {loadError ? (
          <p className="text-body text-muted">{loadError}</p>
        ) : !thread ? (
          <div aria-hidden className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse gap-3">
                <div className="size-9 rounded-full bg-neutral-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-neutral-100" />
                  <div className="h-4 w-3/4 rounded bg-neutral-50" />
                </div>
              </div>
            ))}
          </div>
        ) : thread.comments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="chat" size={32} className="text-soft" />
            <p className="text-heading-3 text-foreground">No comments yet</p>
            <p className="text-body text-muted">Start the discussion for this lesson.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/6">
            {thread.comments.map((comment) => (
              <li key={comment.id} className="py-5">
                <CommentItem
                  comment={comment}
                  canPost={canPost}
                  isAdmin={isAdmin}
                  maxSeconds={maxSeconds}
                  onLike={toggleLike}
                  onReply={(body) => post(body, comment.id)}
                  onChanged={load}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  canPost,
  isAdmin,
  maxSeconds,
  onLike,
  onReply,
  onChanged,
}: {
  comment: CommentView;
  isReply?: boolean;
  canPost: boolean;
  isAdmin: boolean;
  maxSeconds?: number;
  onLike: (c: CommentView) => void;
  onReply?: (body: string) => Promise<void>;
  onChanged: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "reply" | "report">("view");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "purge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [reasonText, setReasonText] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setMenuOpen(false);
    try {
      await action();
      setConfirm(null);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const replies = comment.replies;
  const shownReplies = showAllReplies ? replies : replies.slice(0, VISIBLE_REPLIES);
  const live = !comment.deleted;

  return (
    <article aria-label={`Comment by ${comment.authorName}`} className={cn(comment.hidden && "opacity-60")}>
      <div className="flex gap-3">
        <Avatar comment={comment} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body font-semibold text-foreground">{comment.authorName}</span>
            {comment.authorRole === "instructor" && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-small font-semibold text-primary-400 ring-1 ring-primary-200 ring-inset">
                Instructor
              </span>
            )}
            {comment.authorRole === "admin" && (
              <span className="rounded-full bg-ink/8 px-2 py-0.5 text-small font-semibold text-soft ring-1 ring-ink/15 ring-inset">
                Team
              </span>
            )}
            {comment.pinned && <span className="text-small font-semibold text-soft">· Pinned</span>}
            {comment.hidden && <span className="text-small font-semibold text-red-300">· Hidden</span>}
            <span className="text-small text-subtle">
              {timeAgo(comment.createdAt)}
              {comment.editedAt && live && " · edited"}
            </span>
          </div>

          <div className="mt-1.5">
            {!live ? (
              <p className="text-body text-subtle italic">Comment deleted</p>
            ) : mode === "edit" ? (
              <Composer
                placeholder="Edit your comment"
                initial={comment.body}
                submitLabel="Save"
                autoFocus
                onCancel={() => setMode("view")}
                onSubmit={async (body) => {
                  await api(`/api/comments/${comment.id}`, { method: "PATCH", body: { body } });
                  setMode("view");
                  await onChanged();
                }}
              />
            ) : (
              <CommentBody text={comment.body} maxSeconds={maxSeconds} />
            )}
          </div>

          {/* Admin: reports on this comment */}
          {isAdmin && comment.reports && comment.reports.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
              <p className="text-small font-semibold text-red-200">
                {comment.reports.length} {comment.reports.length === 1 ? "report" : "reports"}
              </p>
              <ul className="mt-1 space-y-0.5 text-small text-red-100/80">
                {comment.reports.map((r, i) => (
                  <li key={i}>
                    {r.reason} <span className="text-red-100/50">· {timeAgo(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => run(() => api(`/api/comments/${comment.id}/reports/dismiss`, { method: "POST" }))}
                className="mt-2 text-small font-semibold text-red-100 underline-offset-2 hover:underline"
              >
                Dismiss reports
              </button>
            </div>
          )}

          {/* Actions */}
          {live && mode !== "edit" && (
            <div className="relative mt-2 flex flex-wrap items-center gap-1">
              <ActionButton
                onClick={() => canPost && onLike(comment)}
                active={comment.likedByMe}
                disabled={!canPost || comment.hidden}
                label={comment.likedByMe ? "Unlike" : "Like"}
              >
                <Icon name="heart" size={16} className={comment.likedByMe ? "text-red-500" : undefined} />
                {comment.likeCount > 0 ? comment.likeCount : "Like"}
              </ActionButton>
              {!isReply && canPost && !comment.hidden && (
                <ActionButton onClick={() => setMode(mode === "reply" ? "view" : "reply")}>
                  <Icon name="reply" size={16} />
                  Reply
                </ActionButton>
              )}
              {canPost && (
                <ActionButton onClick={() => setMenuOpen((v) => !v)} label="More actions" active={menuOpen}>
                  <Icon name="more" size={16} />
                </ActionButton>
              )}

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute top-9 left-0 z-20 w-52 rounded-xl border border-ink/10 bg-neutral-50 p-1.5 shadow-(--shadow-popover)"
                >
                  {comment.mine && (
                    <>
                      <MenuItem onClick={() => (setMenuOpen(false), setMode("edit"))}>Edit</MenuItem>
                      <MenuItem danger onClick={() => (setMenuOpen(false), setConfirm("delete"))}>
                        Delete
                      </MenuItem>
                    </>
                  )}
                  {!comment.mine && !comment.reportedByMe && (
                    <MenuItem onClick={() => (setMenuOpen(false), setMode("report"))}>
                      <Icon name="flag" size={14} /> Report
                    </MenuItem>
                  )}
                  {!comment.mine && comment.reportedByMe && <p className="px-3 py-2 text-small text-subtle">You reported this</p>}
                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-ink/8" />
                      <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-widest text-subtle uppercase">Admin</p>
                      {!isReply && !comment.hidden && (
                        <MenuItem
                          onClick={() =>
                            run(() => api(`/api/comments/${comment.id}/pin`, { method: "POST", body: { pinned: !comment.pinned } }))
                          }
                        >
                          {comment.pinned ? "Unpin" : "Pin to top"}
                        </MenuItem>
                      )}
                      <MenuItem
                        onClick={() =>
                          run(() => api(`/api/comments/${comment.id}/hide`, { method: "POST", body: { hidden: !comment.hidden } }))
                        }
                      >
                        {comment.hidden ? "Unhide" : "Hide"}
                      </MenuItem>
                      <MenuItem danger onClick={() => (setMenuOpen(false), setConfirm("purge"))}>
                        Delete permanently
                      </MenuItem>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Deleted placeholder: admins can still purge */}
          {!live && isAdmin && (
            <div className="mt-2">
              <ActionButton danger onClick={() => setConfirm("purge")}>
                Delete permanently
              </ActionButton>
            </div>
          )}

          {/* Two-step confirm for destructive actions */}
          {confirm && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
              <p className="text-small text-red-100">
                {confirm === "delete"
                  ? "Delete your comment? Replies stay visible."
                  : "Delete permanently, with all replies, likes and reports? This can't be undone."}
              </p>
              <button
                type="button"
                onClick={() =>
                  run(() =>
                    api(`/api/comments/${comment.id}${confirm === "purge" ? "?permanent=1" : ""}`, { method: "DELETE" }),
                  )
                }
                className="rounded-full bg-red-500/80 px-3 py-1 text-small font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="text-small text-red-100/80 hover:text-red-100">
                Cancel
              </button>
            </div>
          )}

          {/* Report form */}
          {mode === "report" && (
            <form
              className="mt-3 rounded-xl border border-ink/10 bg-ink/4 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const full = reason === "Other" ? reasonText.trim() || "Other" : reason;
                run(async () => {
                  await api(`/api/comments/${comment.id}/report`, { method: "POST", body: { reason: full.slice(0, REPORT_MAX) } });
                  setMode("view");
                });
              }}
            >
              <p className="text-small font-semibold text-foreground">Why are you reporting this?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    className={cn(
                      "rounded-full px-3 py-1 text-small transition-colors",
                      reason === r ? "bg-ink/15 text-foreground ring-1 ring-ink/25" : "bg-ink/6 text-soft hover:bg-ink/10",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === "Other" && (
                <input
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  maxLength={REPORT_MAX}
                  placeholder="Tell us more (optional)"
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-foreground outline-none focus:border-primary-400"
                />
              )}
              <div className="mt-3 flex gap-3">
                <button type="submit" className={buttonStyles({ variant: "glossy", size: "md" })}>
                  Send report
                </button>
                <button type="button" onClick={() => setMode("view")} className="text-body text-muted hover:text-foreground">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {error && <p className="mt-2 text-small text-red-300">{error}</p>}

          {/* Reply composer */}
          {mode === "reply" && onReply && (
            <div className="mt-3">
              <Composer
                placeholder={`Reply to ${comment.authorName}`}
                submitLabel="Reply"
                autoFocus
                onCancel={() => setMode("view")}
                onSubmit={async (body) => {
                  await onReply(body);
                  setMode("view");
                  setShowAllReplies(true);
                }}
              />
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <ul className="mt-4 space-y-4 border-l border-ink/8 pl-4">
              {shownReplies.map((reply) => (
                <li key={reply.id}>
                  <CommentItem
                    comment={reply}
                    isReply
                    canPost={canPost}
                    isAdmin={isAdmin}
                    maxSeconds={maxSeconds}
                    onLike={onLike}
                    onChanged={onChanged}
                  />
                </li>
              ))}
              {replies.length > VISIBLE_REPLIES && !showAllReplies && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAllReplies(true)}
                    className="text-small font-semibold text-soft hover:text-ink"
                  >
                    View {replies.length - VISIBLE_REPLIES} more {replies.length - VISIBLE_REPLIES === 1 ? "reply" : "replies"}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body transition-colors",
        danger ? "text-red-300 light:text-red-600 hover:bg-red-500/15" : "text-foreground hover:bg-ink/8",
      )}
    >
      {children}
    </button>
  );
}
