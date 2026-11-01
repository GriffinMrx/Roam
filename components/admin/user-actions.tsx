"use client";

import { useReverification } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Admin actions on one account (prompts/admin-console.md). Every call goes to a server route
 * that re-checks the role and hierarchy; useReverification shows Clerk's "verify it's you"
 * prompt when the server asks for a fresh verification, then retries the call.
 */

type Action = "ban" | "unban" | "sign-out" | "make-admin" | "remove-admin" | "delete";
type Result = { ok?: boolean; error?: string };

export const ADMIN_BUTTON =
  "inline-flex h-9 items-center rounded-[6px] bg-neutral-200 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50";
export const ADMIN_DANGER =
  "inline-flex h-9 items-center rounded-[6px] bg-red-500/15 px-3 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 light:text-red-600";

/** POSTs JSON and returns the parsed body; Clerk's reverification hint passes through untouched. */
async function postJson(url: string, body: unknown): Promise<Result> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return ((await res.json().catch(() => null)) as Result | null) ?? { error: "Something went wrong." };
}

/** One admin call with Clerk's step-up prompt, busy state, and error text. */
export function useAdminCall() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const call = useReverification(postJson);

  const run = async (url: string, body: unknown, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await call(url, body);
      if (!result?.ok) {
        setError(result?.error ?? "Something went wrong.");
        return false;
      }
      if (after) after();
      else router.refresh();
      return true;
    } catch {
      // Closing Clerk's verification dialog cancels the action.
      setError("Verification cancelled.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error };
}

export function UserActions({
  userId,
  banned,
  isAdmin,
  viewerIsOwner,
  canAct,
}: {
  userId: string;
  banned: boolean;
  isAdmin: boolean;
  viewerIsOwner: boolean;
  /** False for yourself, owners, and (for non-owners) other admins. */
  canAct: boolean;
}) {
  const router = useRouter();
  const { run, busy, error } = useAdminCall();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [typed, setTyped] = useState("");

  if (!canAct) return <p className="text-small text-muted">You can&rsquo;t change this account from here.</p>;

  const act = (action: Action) =>
    run(`/api/admin/users/${userId}`, { action, ...(action === "delete" ? { confirm: typed } : {}) }, action === "delete" ? () => router.replace("/admin/users") : undefined).then(
      (ok) => ok && setConfirming(null),
    );

  const confirmText: Record<Action, string> = {
    ban: "Ban this account? They're signed out everywhere and can't sign in until unbanned.",
    unban: "Unban this account? They can sign in again.",
    "sign-out": "Sign this account out of every device?",
    "make-admin": "Make this account an admin? They can moderate, review courses, and ban learners.",
    "remove-admin": "Remove admin access from this account?",
    delete: 'Delete this account and all its data for good? Type "DELETE" to confirm.',
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => setConfirming("sign-out")} className={ADMIN_BUTTON}>
          Sign out everywhere
        </button>
        <button type="button" disabled={busy} onClick={() => setConfirming(banned ? "unban" : "ban")} className={banned ? ADMIN_BUTTON : ADMIN_DANGER}>
          {banned ? "Unban" : "Ban"}
        </button>
        {viewerIsOwner && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(isAdmin ? "remove-admin" : "make-admin")}
              className={isAdmin ? ADMIN_DANGER : ADMIN_BUTTON}
            >
              {isAdmin ? "Remove admin" : "Make admin"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming("delete")} className={ADMIN_DANGER}>
              Delete account
            </button>
          </>
        )}
      </div>

      {confirming && (
        <div className="max-w-md rounded-sm border border-ink/10 bg-neutral-50 p-4">
          <p className="text-small text-soft">{confirmText[confirming]}</p>
          {confirming === "delete" && (
            <input
              aria-label='Type "DELETE" to confirm'
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-3 h-9 w-full rounded-[6px] border border-border bg-surface px-3 text-small text-foreground focus:border-primary-400 focus:outline-none"
            />
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || (confirming === "delete" && typed !== "DELETE")}
              onClick={() => act(confirming)}
              className={confirming === "unban" || confirming === "make-admin" || confirming === "sign-out" ? ADMIN_BUTTON : ADMIN_DANGER}
            >
              {busy ? "Working…" : "Confirm"}
            </button>
            <button type="button" disabled={busy} onClick={() => (setConfirming(null), setTyped(""))} className={ADMIN_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-small text-red-400">{error}</p>}
    </div>
  );
}

export function AddAdminForm() {
  const { run, busy, error } = useAdminCall();
  const [email, setEmail] = useState("");
  const [added, setAdded] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setAdded(false);
        if (await run("/api/admin/admins", { email })) {
          setEmail("");
          setAdded(true);
        }
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          aria-label="Email of the account to make admin"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-72 max-w-full rounded-[6px] border border-border bg-surface px-3 text-small text-foreground placeholder:text-subtle focus:border-primary-400 focus:outline-none"
        />
        <button type="submit" disabled={busy || !email} className={ADMIN_BUTTON}>
          {busy ? "Adding…" : "Add admin"}
        </button>
      </div>
      {error && <p className="text-small text-red-400">{error}</p>}
      {added && <p className={cn("text-small text-success")}>Added. They&rsquo;ll see the console next time they load a page.</p>}
    </form>
  );
}

/** Remove-admin button for a row on the Admins page. */
export function RemoveAdminButton({ userId }: { userId: string }) {
  const { run, busy, error } = useAdminCall();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={() => run(`/api/admin/users/${userId}`, { action: "remove-admin" })} className={ADMIN_DANGER}>
        {busy ? "Removing…" : "Remove"}
      </button>
      {error && <span className="text-small text-red-400">{error}</span>}
    </span>
  );
}
