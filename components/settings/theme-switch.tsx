"use client";

import { cn } from "@/lib/cn";
import { setThemeChoice, useThemeChoice } from "@/lib/theme";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme-shared";

/*
 * Light / Dark / System. Applies immediately and is kept on this device (localStorage),
 * so there is no Save button and nothing is sent to the server.
 */

const LABELS: Record<ThemeChoice, string> = { light: "Light", dark: "Dark", system: "System" };

export function ThemeSwitch() {
  const choice = useThemeChoice();

  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <div className="max-w-md">
        <p className="text-body-lg text-foreground">Theme</p>
        <p className="mt-1 text-body text-muted">
          System follows your device setting. Saved on this device.
        </p>
      </div>
      <div role="radiogroup" aria-label="Theme" className="flex shrink-0 flex-wrap gap-2">
        {THEME_CHOICES.map((option) => {
          const active = choice === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setThemeChoice(option)}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 text-body font-medium transition-colors",
                active
                  ? "bg-linear-to-b from-gloss-from to-gloss-to text-neutral-950 shadow-(--shadow-pill)"
                  : "bg-ink/6 text-soft ring-1 ring-ink/10 ring-inset hover:bg-ink/10",
              )}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
