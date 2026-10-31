import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isFreePreviewLesson } from "@/sanity/free-lessons";

// Private API routes: learner progress and bookmarks require a signed-in user (AGENTS §12).
// API callers get a 401 JSON response, not a redirect to the sign-in page.
const isProtectedApi = createRouteMatcher(["/api/progress(.*)", "/api/bookmarks(.*)"]);

// Course detail and My Learning pages require sign-in (the /courses catalog stays public).
// Signed-out visitors are redirected to sign-in and returned to the requested URL afterwards.
const isProtectedPage = createRouteMatcher(["/courses/(.*)", "/my-learning(.*)"]);

// Lessons require sign-in too, except free-preview lessons (decided from Sanity data).
const LESSON_PATH = /^\/lessons\/([^/]+)\/?$/;

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPage(request)) await auth.protect();

  const lesson = LESSON_PATH.exec(request.nextUrl.pathname);
  if (lesson || request.nextUrl.pathname.startsWith("/lessons/")) {
    const { userId } = await auth();
    if (!userId && !(lesson && (await isFreePreviewLesson(decodeURIComponent(lesson[1]))))) {
      await auth.protect();
    }
  }

  if (isProtectedApi(request)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
