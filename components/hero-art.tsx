"use client";

import type { ReactNode } from "react";
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

export function HeroHeadingLine({ text, line }: { text: string; line: "top" | "bottom" }) {
  const theme = useResolvedTheme();
  return <TechText text={text} fontWeight={700} fontSize={64} gradient={HEADING[theme][line]} />;
}
