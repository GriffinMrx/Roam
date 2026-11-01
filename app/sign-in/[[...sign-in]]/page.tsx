import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

/** Accounts created here (e.g. "Continue with Google") go to onboarding too (prompts/onboarding-split.md). */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense>
        <SignIn signUpForceRedirectUrl="/onboarding" />
      </Suspense>
    </div>
  );
}
