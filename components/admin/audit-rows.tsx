import Link from "next/link";
import type { recentAuditEntries } from "@/lib/admin-data";

/* Audit log rows, shared by the Overview card and the Audit log page. */

type Row = Awaited<ReturnType<typeof recentAuditEntries>>[number];

const ACTIONS: Record<string, string> = {
  "user.ban": "banned",
  "user.unban": "unbanned",
  "user.sign-out": "signed out everywhere",
  "user.make-admin": "made admin",
  "user.remove-admin": "removed admin from",
  "user.delete": "deleted the account of",
  "course.approve": "approved course",
  "course.reject": "requested changes on course",
  "course.unpublish": "unpublished course",
  "comment.hide": "hid a comment",
  "comment.unhide": "unhid a comment",
  "comment.pin": "pinned a comment",
  "comment.unpin": "unpinned a comment",
  "comment.delete": "permanently deleted a comment",
  "comment.dismiss-reports": "dismissed reports on a comment",
  "survey.export": "downloaded the survey CSV",
  "chat.view-reports": "opened chat reports",
  "chat.delete-message": "deleted a reported chat message",
  "chat.dismiss-reports": "dismissed reports on a chat message",
};

export const auditLabel = (action: string) => ACTIONS[action] ?? action;

function Target({ row }: { row: Row }) {
  if (row.targetType === "user" || row.targetType === "admin") {
    const name = row.targetName ?? (typeof row.details.name === "string" ? row.details.name : null) ?? "a deleted account";
    return row.targetName ? (
      <Link href={`/admin/users/${row.targetId}`} className="text-foreground hover:underline">
        {name}
      </Link>
    ) : (
      <span className="text-foreground">{name}</span>
    );
  }
  return null;
}

export function AuditRows({ rows, compact = false }: { rows: Row[]; compact?: boolean }) {
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <ul className="flex flex-col divide-y divide-ink/5">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-body">
          <Link href={`/admin/users/${row.actorId}`} className="font-medium text-foreground hover:underline">
            {row.actor}
          </Link>
          <span className="text-soft">{auditLabel(row.action)}</span>
          <Target row={row} />
          {!compact && typeof row.details.note === "string" && row.details.note && (
            <span className="w-full text-small text-muted">Note: {row.details.note}</span>
          )}
          <span className="ml-auto text-small text-subtle">
            {when(row.createdAt)}
            {!compact && row.ip && ` · ${row.ip}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
