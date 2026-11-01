"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/** Keeps the first-paint auth hint (lib/auth-hint.ts) right after signing in or out in place. */
export function AuthHintSync() {
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (isLoaded) document.documentElement.dataset.auth = isSignedIn ? "in" : "out";
  }, [isLoaded, isSignedIn]);
  return null;
}
