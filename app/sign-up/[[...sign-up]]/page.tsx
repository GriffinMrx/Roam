import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

/** New accounts continue to /onboarding to choose learning or teaching (prompts/teachers-phase-1.md). */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense>
        <SignUp forceRedirectUrl="/onboarding" />
      </Suspense>
    </div>
  );
}
