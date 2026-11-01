"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_CHOICES, THEME_STORAGE_KEY, type ResolvedTheme, type ThemeChoice } from "./theme-shared";

/*
 * Client side of the color theme: the choice lives in localStorage, the applied theme on
 * <html data-theme>. The server always renders dark; the <head> script fixes it before paint.
 */

const listeners = new Set<() => void>();
let wired = false;

export function getThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_CHOICES.includes(stored as ThemeChoice) ? (stored as ThemeChoice) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const systemQuery = () => window.matchMedia("(prefers-color-scheme: light)");

function apply() {
  const choice = getThemeChoice();
  const light = choice === "light" || (choice === "system" && systemQuery().matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
  listeners.forEach((listener) => listener());
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!wired) {
    wired = true;
    // System mode follows the OS live; other tabs follow a change made in this one.
    systemQuery().addEventListener("change", () => {
      if (getThemeChoice() === "system") apply();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === THEME_STORAGE_KEY) apply();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const resolved = (): ResolvedTheme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** The saved choice (Light / Dark / System). */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, getThemeChoice, () => DEFAULT_THEME);
}

/** The theme on screen right now. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, resolved, () => "dark");
}

/** Mounted once in the root layout so System mode and other tabs stay in sync on every page. */
export function ThemeSync() {
  useEffect(() => subscribe(() => {}), []);
  return null;
}
