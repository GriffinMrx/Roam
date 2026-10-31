"use client";

import { useEffect } from "react";

/** Focuses (and selects) the field with `targetId` when the user presses ⌘K / Ctrl+K. */
export function SearchShortcut({ targetId }: { targetId: string }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const target = document.getElementById(targetId);
        target?.focus();
        if (target instanceof HTMLInputElement) target.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [targetId]);

  return null;
}
