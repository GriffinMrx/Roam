import { cn } from "@/lib/cn";

/** Brand mark from the design sheet with the Roam wordmark. Size it with a text-* class. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-foreground",
        className ?? "text-heading-3",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="1.3em"
        height="1.3em"
        className="text-primary-500"
        fill="currentColor"
        aria-hidden
      >
        <path d="M1 3h8.5L12 8l2.5-5H23L12 22 1 3Z" />
      </svg>
      Roam
    </span>
  );
}
