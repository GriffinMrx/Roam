import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { OnboardingFlow } from "@/components/teach/onboarding-flow";
import { getTeacherProfile } from "@/lib/teach/store";
import { getUserProfile } from "@/lib/user-profile";
import { getCategories } from "@/sanity/data";

export const metadata: Metadata = { title: "Welcome · Roam", robots: { index: false } };

/**
 * Standalone onboarding (prompts/onboarding-survey-review-and-phase-2.md): after sign-up the
 * full survey, and from the navbar's "Become a Teacher" (?role=teacher) only the teacher
 * profile (prompts/onboarding-split.md). No site header or footer, like the reference.
 * Signed-in only (proxy).
 */
export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<div aria-hidden className="min-h-screen w-full bg-background" />}>
      <Onboarding searchParams={searchParams} />
    </Suspense>
  );
}

async function Onboarding({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  const user = await currentUser();
  const wantsTeach = (await searchParams).role === "teacher";
  if (!user) redirect(`/sign-in?redirect_url=/onboarding${wantsTeach ? "?role=teacher" : ""}`);

  const [teacher, profile, categories] = await Promise.all([getTeacherProfile(user.id), getUserProfile(user.id), getCategories()]);
  // Already a teacher: nothing to set up.
  if (teacher && wantsTeach) redirect("/settings?tab=courses");
  // Survey already answered: the full flow is done (prompts/onboarding-split.md).
  if (profile && !wantsTeach) redirect("/");

  const mode = profile ? "teacher" : "full";
  return (
    <OnboardingFlow
      // The router keeps this page's client state between visits; a new key starts the flow
      // fresh, so "Become a Teacher" right after the survey doesn't reopen its last step.
      key={`${mode}-${wantsTeach}`}
      defaultName={user.fullName?.trim() || user.username || ""}
      // "Become a Teacher" after answering shows only the teacher profile; without answers the
      // survey comes first, with "teach" preselected.
      mode={mode}
      startRole={wantsTeach ? "teach" : null}
      categories={categories.filter((c) => c.slug && c.title).map((c) => ({ slug: c.slug as string, title: c.title as string }))}
    />
  );
}
