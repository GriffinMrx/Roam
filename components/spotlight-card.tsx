"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Wraps a card with a soft radial glow that follows the pointer
 * (spotlight effect, after reactbits.dev/components/spotlight-card).
 * The wrapped card is rendered untouched; the glow is an overlay on top of it.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgb(249 115 22 / 0.12)", // Primary 500 at 12%
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("group/spotlight relative flex rounded-md [&>*]:flex-1", className)}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/spotlight:opacity-100 group-focus-within/spotlight:opacity-100"
        style={{
          background: `radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 80%)`,
        }}
      />
    </div>
  );
}
