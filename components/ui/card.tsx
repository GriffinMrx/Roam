import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./badge";
import { Icon, type IconName } from "./icon";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-md border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md",
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
  className,
}: {
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: number;
  monogram?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-neutral-900 text-heading-2 text-white"
        >
          {monogram}
        </span>
        <div className="min-w-0">
          <h3 className="text-body-lg font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-body text-subtle">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-muted">
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
