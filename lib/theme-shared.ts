/** Color theme choice (prompts/light-mode.md). Safe on the server and the client. */

export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

/** localStorage key; the choice is kept per device. */
export const THEME_STORAGE_KEY = "roam-theme";

export const DEFAULT_THEME: ThemeChoice = "dark";

/**
 * Runs in <head> before first paint (app/layout.tsx), so a saved light theme never flashes dark.
 * A fixed string: it reads only the stored choice and the system preference.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}");var l=c==="light"||(c==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.theme=l?"light":"dark"}catch(e){}})()`;
