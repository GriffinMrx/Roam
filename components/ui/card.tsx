import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./badge";
import { Icon, type IconName } from "./icon";

export function Card({
  className,
  children,
  framed = true,
}: {
  className?: string;
  children: ReactNode;
  /** false: content layout only, for cards drawn inside another frame (e.g. SpotlightCard). */
  framed?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col",
        framed && "rounded-md border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </article>
  );
}

function Meta({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon name={icon} size={16} className="text-muted" />
      {children}
    </span>
  );
}

/* ---------- Course card ---------- */

export function CourseCard({
  title,
  description,
  level,
  duration,
  modules,
  monogram = title.charAt(0),
  monogramClassName = "bg-black",
  media,
  href,
  layout = "row",
  framed,
  className,
}: {
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: number;
  monogram?: string;
  /** Background for the monogram tile, e.g. a course's brand color. */
  monogramClassName?: string;
  /** Shown in the tile instead of the monogram, e.g. the course cover image. */
  media?: ReactNode;
  /** Makes the whole card a link (the title link stretches over the card). */
  href?: string;
  /** "row": tile beside the title. "stacked": tile above, meta row pinned to the bottom. */
  layout?: "row" | "stacked";
  /** See Card. */
  framed?: boolean;
  className?: string;
}) {
  const stacked = layout === "stacked";

  return (
    <Card framed={framed} className={className}>
      <div className={cn("flex gap-4", stacked && "flex-1 flex-col gap-6")}>
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-sm font-semibold text-white",
            stacked ? "size-16 rounded-md text-heading-1" : "size-12 text-heading-2",
            !media && monogramClassName,
          )}
        >
          {media ?? monogram}
        </span>
        <div className="min-w-0">
          <h3 className={cn("text-foreground", stacked ? "text-heading-3" : "text-body-lg font-medium")}>
            {href ? (
              <Link
                href={href}
                className="rounded-xs after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary-400"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className={cn("text-body text-subtle", stacked ? "mt-3" : "mt-1")}>{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "mt-6 flex flex-wrap items-center gap-y-2 text-small text-muted",
          stacked ? "gap-x-4 border-t border-border pt-4" : "gap-x-6",
        )}
      >
        <Meta icon="chart">{level}</Meta>
        <Meta icon="clock">{duration}</Meta>
        <Meta icon="folder">{modules} modules</Meta>
      </div>
    </Card>
  );
}

/* ---------- Lesson card (video / lesson) ---------- */

export function LessonCard({
  type,
  title,
  description,
  meta,
  href,
  resumeAt,
  className,
}: {
  type: "video" | "lesson";
  title: string;
  description: string;
  /** Footer meta, e.g. "Lesson 5.1 · 12:45" or "Module 5". */
  meta: string;
  href: string;
  /** Video only: timestamp for the "Watch from" action. */
  resumeAt?: string;
  className?: string;
}) {
  const isVideo = type === "video";

  return (
    <Card className={className}>
      <Badge variant={isVideo ? "video" : "lesson"} className="self-start">
        {type}
      </Badge>
      <h3 className="mt-3 text-body-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1 flex-1 text-body text-subtle">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-small">
        <span className="whitespace-nowrap text-muted">{meta}</span>
        <Link
          href={href}
          className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-primary-500 transition-colors hover:text-primary-600"
        >
          {isVideo ? `Watch from ${resumeAt ?? "start"}` : "View lesson"}
          <Icon name={isVideo ? "play-circle" : "link-external"} size={16} />
        </Link>
      </div>
    </Card>
  );
}

/* ---------- Resource card ---------- */

export function ResourceCard({
  title,
  description,
  format,
  size,
  href,
  className,
}: {
  title: string;
  description: string;
  format: string;
  size: string;
  href: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-1 gap-4">
        <Icon name="file" size={24} className="shrink-0 text-muted" />
        <div className="min-w-0">
          <h3 className="text-body-lg font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-body text-subtle">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-small text-muted">
        <span>
          {format} <span aria-hidden>·</span> {size}
        </span>
        <a
          href={href}
          className="text-primary-500 transition-colors hover:text-primary-600"
          aria-label={`Open ${title}`}
        >
          <Icon name="link-external" size={18} />
        </a>
      </div>
    </Card>
  );
}
