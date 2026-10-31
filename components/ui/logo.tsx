import { cn } from "@/lib/cn";

/** The "Roam." wordmark (text only). Size it with a text-* class. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold text-foreground",
        className ?? "text-heading-3",
      )}
    >
      Roam<span aria-hidden>.</span>
    </span>
  );
}
