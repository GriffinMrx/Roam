"use client";

import { useEffect, useState, type ElementType, type HTMLAttributes, type PropsWithChildren } from "react";
import { domAnimation, LazyMotion, m } from "motion/react";
import { cn } from "@/lib/cn";

/*
 * Hover Border Gradient, from ui.aceternity.com/components/hover-border-gradient.
 * A white light circles the border; on hover the whole border lights up.
 * Adapted for this project: white hover highlight (Aceternity's is blue), dark-only
 * classes, the rotation interval kept inside its effect, and LazyMotion so only the
 * DOM animation features ship (not the full motion bundle).
 */

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const DIRECTIONS: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

const movingMap: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  RIGHT:
    "radial-gradient(16.2% 41.199999999999996% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
};

const highlight =
  "radial-gradient(75% 181.15942028985506% at 50% 50%, #ffffff 0%, rgba(255, 255, 255, 0) 100%)";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: PropsWithChildren<
  {
    as?: ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & HTMLAttributes<HTMLElement> & { href?: string }
>) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  useEffect(() => {
    if (hovered) return;
    const interval = setInterval(() => {
      setDirection((current) => {
        const index = DIRECTIONS.indexOf(current);
        const next = clockwise
          ? (index - 1 + DIRECTIONS.length) % DIRECTIONS.length
          : (index + 1) % DIRECTIONS.length;
        return DIRECTIONS[next];
      });
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [hovered, duration, clockwise]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex h-min w-fit flex-col flex-nowrap content-center items-center justify-center gap-10 overflow-visible rounded-full border border-border bg-white/20 light:bg-neutral-900/80 decoration-clone p-px transition duration-500 hover:bg-black/10",
        containerClassName,
      )}
      {...props}
    >
      <div className={cn("z-10 w-auto rounded-[inherit] bg-black px-4 py-2 text-white", className)}>
        {children}
      </div>
      <LazyMotion features={domAnimation} strict>
        <m.div
          className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
          style={{ filter: "blur(2px)", position: "absolute", width: "100%", height: "100%" }}
          initial={{ background: movingMap[direction] }}
          animate={{ background: hovered ? [movingMap[direction], highlight] : movingMap[direction] }}
          transition={{ ease: "linear", duration: duration ?? 1 }}
        />
      </LazyMotion>
      <div className="absolute inset-[2px] z-1 flex-none rounded-[100px] bg-black" />
    </Tag>
  );
}
