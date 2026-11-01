"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SwarmCursor } from "@/components/swarm-cursor";
import { TechText } from "@/components/tech-text";
import { useResolvedTheme } from "@/lib/theme";

/*
 * Theme-aware colors for the canvas-painted hero (canvas can't read CSS tokens live).
 * Dark: white swarm and a white-to-gray heading. Light: the same, mirrored to slate.
 */

const HEADING = {
  dark: { top: ["#ffffff", "#d4d4d8"], bottom: ["#d4d4d8", "#8b8b94"] },
  light: { top: ["#0f172a", "#334155"], bottom: ["#334155", "#64748b"] },
} as const;

export function HeroSwarm({ children }: { children: ReactNode }) {
  const light = useResolvedTheme() === "light";
  return (
    <SwarmCursor color={light ? "#0f172a" : "#ffffff"} lightMode={light}>
      {children}
    </SwarmCursor>
  );
}

/** CSS twins of HEADING for the server-rendered text (the light: variant follows data-theme). */
const FALLBACK = {
  top: "from-white to-zinc-300 light:from-slate-900 light:to-slate-700",
  bottom: "from-zinc-300 to-[#8b8b94] light:from-slate-700 light:to-slate-500",
} as const;

/**
 * The canvas only paints after hydration, so the server also sends the line as plain gradient
 * text in the same spot. It stays until the canvas has drawn, then fades out, so a reload
 * never shows an empty hero.
 */
export function HeroHeadingLine({ text, line }: { text: string; line: "top" | "bottom" }) {
  const theme = useResolvedTheme();
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    // Two frames: the canvas draws on its first animation frame after mount.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return (
    <span className="relative block h-full w-full">
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${painted ? "opacity-0" : "opacity-100"}`}
      >
        <span
          className={`bg-linear-to-b bg-clip-text -translate-y-[0.03em] pb-[0.12em] text-[44px] leading-tight font-bold tracking-[-0.05em] whitespace-nowrap text-transparent sm:text-[64px] ${FALLBACK[line]}`}
        >
          {text}
        </span>
      </span>
      <TechText text={text} fontWeight={700} fontSize={64} gradient={HEADING[theme][line]} />
    </span>
  );
}
