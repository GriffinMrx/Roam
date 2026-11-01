import "server-only";

import { defineQuery } from "next-sanity";

import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import type { CourseStatus } from "./schema";

/*
 * Admin decisions on teacher courses live in Sanity `courseReview` documents
 * (prompts/onboarding-survey-review-and-phase-2.md): admins decide in the Studio's Course
 * Review tool (or /admin/courses), and the site shows a teacher course only while its review
 * is "approved". Public reads go through the cached Sanity fetch, so Sanity Live refreshes
 * the site the moment a decision changes. Writes here use the server-only token.
 */

export type ReviewStatus = "pending" | "approved" | "changesRequested" | "unpublished";
export type Review = { status: ReviewStatus; note: string | null };

export const reviewDocId = (courseId: string) => `courseReview.${courseId}`;

export const APPROVED_IDS_QUERY = defineQuery(`*[_type == "courseReview" && status == "approved"].courseId`);
const REVIEWS_QUERY = defineQuery(`*[_type == "courseReview" && courseId in $ids] { courseId, status, note }`);

/** Approved course ids, uncached (access checks: proxy, comments). Public pages use the cached read in public.ts. */
export async function approvedCourseIdsNow(): Promise<string[]> {
  const ids = await client.fetch(APPROVED_IDS_QUERY, {}, { cache: "no-store" });
  return (ids ?? []).filter((id): id is string => typeof id === "string");
}

/** Reviews by course id (uncached; owner and admin views). */
export async function reviewsFor(courseIds: string[]): Promise<Map<string, Review>> {
  if (!courseIds.length) return new Map();
  const rows = await client.fetch(REVIEWS_QUERY, { ids: courseIds }, { cache: "no-store" });
  return new Map(
    (rows ?? [])
      .filter((r) => r.courseId)
      .map((r) => [r.courseId as string, { status: (r.status ?? "pending") as ReviewStatus, note: r.note ?? null }]),
  );
}

/** What the teacher sees: their own draft state, overridden by the admin's decision once submitted. */
export function effectiveStatus(submitted: boolean, review: Review | undefined): CourseStatus {
  if (!submitted || !review) return submitted ? "pending" : "draft";
  if (review.status === "approved") return "published";
  if (review.status === "pending") return "pending";
  return "rejected";
}

export type ReviewSnapshot = {
  courseId: string;
  courseSlug: string;
  title: string;
  summary: string;
  teacherName: string;
  teacherSlug: string;
  categoryTitle: string;
  level: string;
  price: number;
  outline: { title: string; lessons: { title: string; durationSeconds: number; videoUrl: string; freePreview: boolean }[] }[];
};

function snapshotFields(s: ReviewSnapshot) {
  const lessons = s.outline.flatMap((m) => m.lessons);
  return {
    courseId: s.courseId,
    courseSlug: s.courseSlug,
    title: s.title,
    summary: s.summary,
    teacherName: s.teacherName,
    teacherSlug: s.teacherSlug,
    categoryTitle: s.categoryTitle,
    level: s.level,
    price: s.price,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce((n, l) => n + l.durationSeconds, 0),
    outline: s.outline.map((m, mi) => ({
      _key: `m${mi}`,
      _type: "reviewModule",
      title: m.title,
      lessons: m.lessons.map((l, li) => ({
        _key: `m${mi}l${li}`,
        _type: "reviewLesson",
        title: l.title,
        durationSeconds: l.durationSeconds,
        ...(l.videoUrl ? { videoUrl: l.videoUrl } : {}),
        freePreview: l.freePreview,
      })),
    })),
  };
}

/** Teacher submitted: (re)open the review with a fresh snapshot. */
export async function openReview(snapshot: ReviewSnapshot) {
  const id = reviewDocId(snapshot.courseId);
  await getWriteClient()
    .transaction()
    .createIfNotExists({ _id: id, _type: "courseReview", status: "pending" })
    .patch(id, (p) =>
      p.set({ ...snapshotFields(snapshot), status: "pending", submittedAt: new Date().toISOString() }).unset(["note", "decidedAt"]),
    )
    .commit();
}

/** A submitted course was edited: refresh what admins see, keep the decision. */
export async function refreshReviewSnapshot(snapshot: ReviewSnapshot) {
  const id = reviewDocId(snapshot.courseId);
  const write = getWriteClient();
  if (!(await write.getDocument(id))) return;
  await write.patch(id).set(snapshotFields(snapshot)).commit();
}

/** An admin decided on the site (/admin/courses); the Studio tool writes the same fields. */
export async function decideReview(courseId: string, status: ReviewStatus, note: string) {
  const id = reviewDocId(courseId);
  const write = getWriteClient();
  if (!(await write.getDocument(id))) return false;
  await write
    .patch(id)
    .set({ status, decidedAt: new Date().toISOString(), ...(note ? { note } : {}) })
    .commit();
  return true;
}

export async function deleteReview(courseId: string) {
  await getWriteClient().delete(reviewDocId(courseId));
}
