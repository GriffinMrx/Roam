"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARD_BUTTON, FIELD_ERROR, FIELD_HINT, FIELD_LABEL, INPUT, TEXTAREA } from "@/components/settings/styles";
import { forgetTeacherStatus } from "@/components/teach-button";
import { TeacherProfileInput, type TeacherProfileDraft } from "@/lib/teach/schema";

/*
 * Become a teacher / edit your teacher profile. Saved through POST /api/teach/profile,
 * which also gives the account the teacher role; the photo is the Clerk avatar.
 */
export function TeacherProfileForm({
  initial,
  isTeacher,
  next,
  submitClassName = CARD_BUTTON,
  formClassName = "flex w-[min(36rem,100%)] flex-col gap-4",
}: {
  initial: TeacherProfileDraft;
  isTeacher: boolean;
  /** Where to go after becoming a teacher. */
  next: string;
  /** Onboarding uses its full-width Continue button style. */
  submitClassName?: string;
  formClassName?: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [draft, setDraft] = useState(initial);
  const [expertise, setExpertise] = useState(initial.expertise.join(", "));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...draft,
      expertise: expertise
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    };
    const parsed = TeacherProfileInput.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/teach/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save.");
      setStatus("saved");
      if (isTeacher) {
        router.refresh();
      } else {
        // Now a teacher: the navbar pill asks again and switches to "Create Course".
        forgetTeacherStatus();
        await user?.reload().catch(() => {});
        router.push(next);
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  };

  return (
    <form onSubmit={save} className={formClassName}>
      <div>
        <label htmlFor="tp-name" className={FIELD_LABEL}>
          Display name
        </label>
        <input
          id="tp-name"
          required
          maxLength={80}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="tp-headline" className={FIELD_LABEL}>
          Headline
        </label>
        <input
          id="tp-headline"
          maxLength={120}
          value={draft.headline}
          onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          placeholder="e.g. Calisthenics coach, 10 years teaching"
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="tp-expertise" className={FIELD_LABEL}>
          Expertise
        </label>
        <input
          id="tp-expertise"
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="Handstands, Mobility, Strength"
          className={INPUT}
        />
        <p className={FIELD_HINT}>Up to 8 topics, separated by commas.</p>
      </div>
      <div>
        <label htmlFor="tp-bio" className={FIELD_LABEL}>
          About you
        </label>
        <textarea
          id="tp-bio"
          rows={5}
          maxLength={2000}
          value={draft.bio}
          onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          placeholder="Who you are and what you teach. Leave a blank line between paragraphs."
          className={TEXTAREA}
        />
      </div>
      <p className={FIELD_HINT}>Your profile photo is the one on your account.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === "saving"} className={submitClassName}>
          {status === "saving" ? "Saving…" : isTeacher ? "Save profile" : "Become a teacher"}
        </button>
        <p aria-live="polite" className="text-body">
          {status === "saved" && isTeacher && <span className="text-soft">Saved.</span>}
          {status === "error" && error && <span className={FIELD_ERROR}>{error}</span>}
        </p>
      </div>
    </form>
  );
}
