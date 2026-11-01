import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { SettingsShell } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CourseEditor } from "@/components/teach/course-editor";
import { getOwnCourse, getTeacherProfile } from "@/lib/teach/store";
import { getCategories } from "@/sanity/data";

export const metadata: Metadata = { title: "Edit course · Roam", robots: { index: false } };

/**
 * A teacher's course editor (prompts/teachers-phase-1.md). Signed-in only (proxy); then
 * teachers only, and only their own course: anyone else gets a 404.
 */
export default function EditCoursePage({ params }: PageProps<"/settings/courses/[id]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <main className="relative z-10 flex w-full flex-1 flex-col">
        <h1 className="sr-only">Edit course</h1>
        <Suspense fallback={<div aria-hidden className="flex-1 animate-pulse bg-neutral-50" />}>
          <Editor params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Editor({ params }: { params: PageProps<"/settings/courses/[id]">["params"] }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/settings/courses/${id}`);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [profile, course, categories] = await Promise.all([getTeacherProfile(userId), getOwnCourse(userId, id), getCategories()]);
  if (!profile || !course) notFound();

  return (
    <SettingsShell active="courses" isTeacher>
      {/* Remounts after every save, so new modules and lessons pick up their server ids. */}
      <CourseEditor
        key={course.version}
        course={course}
        categories={categories.filter((c) => c.slug && c.title).map((c) => ({ slug: c.slug as string, title: c.title as string }))}
      />
    </SettingsShell>
  );
}
