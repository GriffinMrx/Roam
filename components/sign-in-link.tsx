"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The header's Sign in. Clerk's <SignInButton> renders nothing until Clerk has loaded in the
 * browser, so the button popped in late on every reload. This is a plain link that is there from
 * the first paint and goes to the same sign-in page, coming back to the current page after.
 */
export function SignInLink({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href="/sign-in"
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const back = window.location.pathname + window.location.search;
        router.push(back === "/" ? "/sign-in" : `/sign-in?redirect_url=${encodeURIComponent(back)}`);
      }}
    >
      {children}
    </Link>
  );
}
