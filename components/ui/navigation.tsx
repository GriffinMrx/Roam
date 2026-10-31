import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Logo } from "./logo";

/* ---------- Navbar ---------- */

export type NavItem = { label: string; href: string; active?: boolean };

export function Navbar({
  items,
  className,
  linksClassName,
}: {
  items: NavItem[];
  className?: string;
  /** Extra classes for the link list, e.g. to hide it at small widths. */
  linksClassName?: string;
}) {
  return (
    <nav aria-label="Main" className={cn("flex items-center gap-12", className)}>
      <Link href="/" aria-label="Roam home">
        <Logo />
      </Link>
      <ul className={cn("flex items-center gap-8 text-body font-medium", linksClassName)}>
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "transition-colors",
                item.active
                  ? "text-primary-500"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- Breadcrumbs ---------- */

export function Breadcrumbs({
  items,
  className,
}: {
  /** Last item is the current page and is not linked. */
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-body">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={item.label}>
              <li>
                {last || !item.href ? (
                  <span aria-current={last ? "page" : undefined} className="text-muted">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-subtle transition-colors hover:text-primary-500"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!last && (
                <li aria-hidden className="text-subtle">
                  <Icon name="chevron-right" size={16} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- Pagination ---------- */

/** Page numbers to show, with "…" gaps: e.g. 1 2 3 … 8. */
function pageList(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["…" as const, p] : [p]));
}

const pageItem =
  "flex size-8 items-center justify-center rounded-sm text-body transition-colors";

export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  const arrow = (target: number, dir: "left" | "right") => {
    const icon = <Icon name={dir === "left" ? "chevron-left" : "chevron-right"} size={18} />;
    return target < 1 || target > totalPages ? (
      <span aria-disabled className={cn(pageItem, "text-muted")}>
        {icon}
      </span>
    ) : (
      <Link
        href={hrefFor(target)}
        aria-label={dir === "left" ? "Previous page" : "Next page"}
        className={cn(pageItem, "text-muted hover:bg-neutral-100")}
      >
        {icon}
      </Link>
    );
  };

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex items-center gap-2">
        <li>{arrow(page - 1, "left")}</li>
        {pageList(page, totalPages).map((p, i) => (
          <li key={i}>
            {p === "…" ? (
              <span className={cn(pageItem, "text-subtle")}>…</span>
            ) : (
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  pageItem,
                  p === page
                    ? "border border-primary-400 text-primary-500"
                    : "text-muted hover:bg-neutral-100",
                )}
              >
                {p}
              </Link>
            )}
          </li>
        ))}
        <li>{arrow(page + 1, "right")}</li>
      </ul>
    </nav>
  );
}
