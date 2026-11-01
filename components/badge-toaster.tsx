"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaybeIcon } from "@/components/ui";
import { BADGE_EVENT, type BadgeEventDetail } from "@/lib/badges-shared";

/*
 * "Badge earned" toasts. The progress route returns newly earned badges; the course progress
 * provider fires BADGE_EVENT with them, and this (mounted once in the root layout) shows them.
 */
export function BadgeToaster() {
  const [toasts, setToasts] = useState<{ id: number; key: string; title: string }[]>([]);

  useEffect(() => {
    let next = 0;
    const onBadges = (event: Event) => {
      const { badges } = (event as CustomEvent<BadgeEventDetail>).detail;
      const added = badges.map((b) => ({ id: ++next, ...b }));
      setToasts((current) => [...current, ...added].slice(-3));
      for (const toast of added) {
        setTimeout(() => setToasts((current) => current.filter((t) => t.id !== toast.id)), 6000);
      }
    };
    window.addEventListener(BADGE_EVENT, onBadges);
    return () => window.removeEventListener(BADGE_EVENT, onBadges);
  }, []);

  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex items-center gap-3 rounded-lg border border-primary-200 bg-surface p-4 shadow-xl"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-500">
            <MaybeIcon name="star" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-small font-semibold tracking-wider text-primary-500 uppercase">Badge earned</p>
            <p className="truncate text-body font-medium text-foreground">{toast.title}</p>
          </div>
          <Link href="/my-learning#badges" className="ml-auto shrink-0 text-small text-muted transition-colors hover:text-foreground">
            View
          </Link>
        </div>
      ))}
    </div>
  );
}
