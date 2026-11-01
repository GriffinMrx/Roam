"use client";

import { UserProfile, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Account settings are Clerk's own profile component (name, photo, emails, password,
 * connected accounts, sessions, delete account): account security is never rebuilt here.
 * Hash routing keeps it on /settings without a catch-all route; the dark theme comes from
 * the ClerkProvider appearance in app/layout.tsx.
 *
 * The server page checks the session, but the browser can sign out while the page is open
 * (signing out here, or in another tab). UserProfile then has no user and Clerk throws, so
 * it only renders while signed in, and a signed-out visitor goes to sign-in.
 */
export function AccountPanel() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in?redirect_url=/settings");
  }, [isLoaded, isSignedIn, router]);

  if (!isSignedIn) return <div aria-hidden className="h-96 w-full animate-pulse rounded-sm bg-neutral-100" />;

  return (
    <UserProfile
      routing="hash"
      appearance={{
        elements: {
          rootBox: "w-full",
          // Sits inside the Settings card, so no border of its own
          cardBox: "w-full max-w-none shadow-none border-0 rounded-sm",
        },
      }}
    />
  );
}
