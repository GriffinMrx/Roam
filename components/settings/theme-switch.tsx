"use client";

import { cn } from "@/lib/cn";
import { setThemeChoice, useThemeChoice } from "@/lib/theme";
import type { ThemeChoice } from "@/lib/theme-shared";

/*
 * Interface theme: System / Light / Dark preview cards (prompts/theme-preview-cards.md), laid
 * out like the reference but in Roam's own palettes. Applies immediately and is kept on this
 * device (localStorage), so there is no Save button and nothing is sent to the server.
 */

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/* Fixed preview colors: each card shows its own theme whatever theme is active (globals.css values). */
const PALETTES = {
  light: { tile: "#f1f5f9", window: "#ffffff", panel: "#f8fafc", bar: "#e2e8f0" },
  dark: { tile: "#000000", window: "#161618", panel: "#1c1c1f", bar: "#2a2a2d" },
} as const;

/** The mini app window: dots, a menu of four bars, and a content panel. */
function MiniWindow({ palette }: { palette: (typeof PALETTES)[keyof typeof PALETTES] }) {
  return (
    <div
      className="absolute inset-x-[10%] top-[14%] bottom-0 rounded-t-[3.5cqw] p-[4cqw]"
      style={{ backgroundColor: palette.window }}
    >
      {/* Sizes in cqw (the card's width) so the preview scales with the card */}
      <div className="flex gap-[1.5cqw]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-[2.8cqw] rounded-full" style={{ backgroundColor: palette.bar }} />
        ))}
      </div>
      <div className="mt-[4cqw] flex gap-[4cqw]">
        <div className="flex w-[24%] flex-col gap-[2cqw]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[5cqw] rounded-[1cqw]" style={{ backgroundColor: palette.bar }} />
          ))}
        </div>
        <div className="flex-1 rounded-[1.5cqw] p-[3cqw]" style={{ backgroundColor: palette.panel }}>
          <span className="block h-[8.5cqw] rounded-[1.5cqw]" style={{ backgroundColor: palette.bar }} />
          <span className="mt-[3cqw] block h-[2.5cqw] rounded-[1cqw]" style={{ backgroundColor: palette.bar }} />
          <span className="mt-[2cqw] ml-auto block h-[1.5cqw] w-1/3 rounded-[1cqw]" style={{ backgroundColor: palette.bar }} />
        </div>
      </div>
    </div>
  );
}

function Preview({ value }: { value: ThemeChoice }) {
  if (value === "system") {
    // Light on the left half, dark on the right half of the same window.
    return (
      <>
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: PALETTES.light.tile }}>
          <MiniWindow palette={PALETTES.light} />
        </div>
        <div className="absolute inset-0 overflow-hidden [clip-path:inset(0_0_0_50%)]" style={{ backgroundColor: PALETTES.dark.tile }}>
          <MiniWindow palette={PALETTES.dark} />
        </div>
      </>
    );
  }
  const palette = PALETTES[value];
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: palette.tile }}>
      <MiniWindow palette={palette} />
    </div>
  );
}

export function ThemeSwitch() {
  const choice = useThemeChoice();

  return (
    <div className="flex flex-col gap-4 py-2 lg:flex-row lg:gap-10">
      <div className="w-56 shrink-0">
        <p className="text-body font-medium text-foreground">Interface Theme</p>
        <p className="mt-0.5 text-body text-muted">Select or customize your UI theme</p>
      </div>
      <div role="radiogroup" aria-label="Interface theme" className="flex gap-3 sm:gap-6">
        {OPTIONS.map((option) => {
          const active = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              onClick={() => setThemeChoice(option.value)}
              className={cn(
                // Settings cards size to their content, so each step sets a width that fits beside the menu.
                "@container relative aspect-3/2 w-24 overflow-hidden rounded-xl transition-shadow sm:w-40 lg:w-36 xl:w-52 min-[87.5rem]:w-64 min-[93rem]:w-70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active ? "ring-2 ring-primary-500 ring-offset-2 ring-offset-neutral-100" : "ring-1 ring-ink/10 hover:ring-ink/25",
              )}
            >
              <Preview value={option.value} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
