"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/cn";

/*
 * Moving Border, from ui.aceternity.com/components/moving-border.
 * A glow travels along an SVG path traced around the element; it shows through
 * a 1px gap between the outer container and the inner panel.
 * Adapted for this project: app color tokens instead of sky/slate, sized for a
 * badge, typed refs.
 */

export function MovingBorder({
  children,
  duration = 3000,
  rx,
  ry,
}: {
  children: ReactNode;
  /** Milliseconds per lap. */
  duration?: number;
  /** Corner radius of the path, any SVG length (e.g. "8" or "30%"). */
  rx?: string;
  ry?: string;
}) {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).x ?? 0);
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).y ?? 0);

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
      >
        <rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
      </svg>
      <motion.div
        style={{ position: "absolute", top: 0, left: 0, display: "inline-block", transform }}
      >
        {children}
      </motion.div>
    </>
  );
}

/** A dark grey badge whose border carries a travelling purple glow (Aceternity's moving-border Button, badge-sized). */
export function MovingBorderBadge({
  children,
  as: Component = "div",
  radius = 8,
  duration,
  className,
  containerClassName,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Corner radius in px for the badge and the glow path (default 8 = rounded-sm). */
  radius?: number;
  duration?: number;
  /** Classes for the inner panel (padding, type). */
  className?: string;
  containerClassName?: string;
}) {
  const borderRadius = `${radius}px`;
  return (
    <Component
      className={cn("relative inline-flex overflow-hidden bg-transparent p-px", containerClassName)}
      style={{ borderRadius }}
    >
      <div className="absolute inset-0" style={{ borderRadius }}>
        <MovingBorder duration={duration} rx={String(radius)} ry={String(radius)}>
          <div className="size-12 bg-[radial-gradient(var(--color-primary-500)_40%,transparent_60%)] opacity-80" />
        </MovingBorder>
      </div>
      <span
        className={cn(
          "relative flex items-center justify-center border border-white/10 bg-neutral-100/80 antialiased backdrop-blur-xl",
          className,
        )}
        style={{ borderRadius }}
      >
        {children}
      </span>
    </Component>
  );
}
