"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

/*
 * Sends signed-in users who haven't answered the onboarding survey to /onboarding
 * (prompts/onboarding-split.md). Navigation only: the flag is Clerk public metadata set on the
 * server when the survey is saved, and no data access depends on it.
 */
const OPEN_PATHS = ["/onboarding", "/sign-in", "/sign-up"];

export function OnboardingGate() {
  const { isLoaded, isSignedIn, user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = (user?.publicMetadata as { onboarded?: unknown } | undefined)?.onboarded === true;
  const open = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isLoaded && isSignedIn && !onboarded && !open) router.replace("/onboarding");
  }, [isLoaded, isSignedIn, onboarded, open, router]);

  return null;
}
