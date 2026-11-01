"use client";

import { UserProfile } from "@clerk/nextjs";

/**
 * Account settings are Clerk's own profile component (name, photo, emails, password,
 * connected accounts, sessions, delete account): account security is never rebuilt here.
 * Hash routing keeps it on /settings without a catch-all route; the dark theme comes from
 * the ClerkProvider appearance in app/layout.tsx.
 */
export function AccountPanel() {
  return (
    <UserProfile
      routing="hash"
      appearance={{
        elements: {
          rootBox: "w-full",
          cardBox: "w-full max-w-none shadow-none border border-white/10 rounded-2xl",
        },
      }}
    />
  );
}
