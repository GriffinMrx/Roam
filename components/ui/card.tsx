import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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

/**
 * Cover-style card pieces (reference: large image on top, raised lighter panel below).
 * Shared by CourseCard layout="cover" and cards built from the same parts.
 */
export function CardCover({ cover, monogram }: { cover?: ReactNode; monogram: string }) {
  return (
    <div aria-hidden className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
      {cover ?? (
        <span className="flex size-full items-center justify-center bg-linear-to-br from-neutral-300 to-black font-display text-display-1 text-white/80">
          {monogram}
        </span>
      )}
      {/* Fade the image into the panel below */}
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/50 to-transparent" />
    </div>
  );
}

/** The raised panel under a CardCover: lighter graphite, top highlight, inner glow. */
export const raisedPanel =
  "relative flex flex-1 flex-col border-t border-white/10 bg-linear-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Deeper drop shadow for cover cards, via SpotlightCard's --spotlight-card-shadow. */
export const raisedCardShadow = {
  "--spotlight-card-shadow": "0 30px 60px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
} as CSSProperties;

export function CourseCard({
  title,
  description,
  level,
  duration,
  modules,
  monogram = title.charAt(0),
  monogramClassName = "bg-black",
  media,
  cover,
  coverOverlay,
  footer,
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
  /** layout="cover": the large image across the top. */
  cover?: ReactNode;
  /** layout="cover": controls over the cover's top-right corner (above the card link). */
  coverOverlay?: ReactNode;
  /** layout="cover": extra content under the meta row, e.g. the learner's progress. */
  footer?: ReactNode;
  /** Makes the whole card a link (the title link stretches over the card). */
  href?: string;
  /**
   * "row": tile beside the title. "stacked": tile above, meta row pinned to the bottom.
   * "cover": large cover image on top, raised panel below (render it in a flush frame).
   */
  layout?: "row" | "stacked" | "cover";
  /** See Card. */
  framed?: boolean;
  className?: string;
}) {
  const stacked = layout === "stacked";

  const titleContent = href ? (
    <Link
      href={href}
      className="rounded-xs after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary-400"
    >
      {title}
    </Link>
  ) : (
    title
  );

  if (layout === "cover") {
    return (
      <Card framed={false} className={className}>
        <div className="relative">
          <CardCover cover={cover} monogram={monogram} />
          {coverOverlay && <div className="absolute top-3 right-3 z-10">{coverOverlay}</div>}
        </div>
        <div className={raisedPanel}>
          <h3 className="text-heading-3 text-foreground">{titleContent}</h3>
          <p className="mt-2 line-clamp-2 text-body text-muted">{description}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-small text-muted">
            <Meta icon="chart">{level}</Meta>
            <Meta icon="clock">{duration}</Meta>
            <Meta icon="folder">{modules} modules</Meta>
          </div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </Card>
    );
  }

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
            {titleContent}
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
