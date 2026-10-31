import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Private API routes: learner progress writes require a signed-in user (AGENTS §12).
// API callers get a 401 JSON response, not a redirect to the sign-in page.
const isProtectedApi = createRouteMatcher(["/api/progress(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedApi(request)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to save progress" }, { status: 401 });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
