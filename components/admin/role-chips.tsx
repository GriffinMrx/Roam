import { cn } from "@/lib/cn";
import type { AdminUserRow } from "@/lib/admin-data";

/* Small status chips for an account: Owner / Admin / Teacher / Banned / No 2FA. */

const CHIP = "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium whitespace-nowrap";

export function RoleChips({ user, showTwoFactor = false }: { user: Pick<AdminUserRow, "role" | "teacher" | "banned" | "twoFactor">; showTwoFactor?: boolean }) {
  return (
    <span className="flex shrink-0 flex-wrap gap-1">
      {user.role === "owner" && <span className={cn(CHIP, "bg-primary-100 text-primary-500")}>Owner</span>}
      {user.role === "admin" && <span className={cn(CHIP, "bg-primary-100 text-primary-500")}>Admin</span>}
      {user.teacher && <span className={cn(CHIP, "bg-neutral-200 text-soft")}>Teacher</span>}
      {user.banned && <span className={cn(CHIP, "bg-red-500/15 text-red-400 light:text-red-600")}>Banned</span>}
      {showTwoFactor && user.role && !user.twoFactor && (
        <span className={cn(CHIP, "bg-amber-500/15 text-amber-600")}>No 2FA</span>
      )}
    </span>
  );
}
