"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMemo, useState, type ReactNode } from "react";
import { FIELD_ERROR } from "@/components/settings/styles";
import { TeacherProfileForm } from "@/components/teach/teacher-profile-form";
import { Icon, Logo, MaybeIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  EXPERIENCE,
  GOALS,
  HEARD_FROM,
  PERSONAS,
  WEEKLY_TIME,
  type RecommendedCourse,
  type SurveyAnswers,
} from "@/lib/survey";

/*
 * Onboarding steps (prompts/onboarding-survey-review-and-phase-2.md), styled after the
 * reference sign-up: choice cards, a full-width Continue button, and segmented progress.
 * Full (after sign-up): role → about you → recommendations (learn) or teacher profile (teach).
 * Teacher ("Become a Teacher" after answering): the teacher profile only
 * (prompts/onboarding-split.md).
 */

type Role = "learn" | "teach";
type Step = "role" | "about" | "recommend" | "teacher";

/** Full-width primary action: inverted from the page (light on dark, dark on light). */
const CONTINUE =
  "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-body font-medium text-neutral-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const PILL = "inline-flex h-8 items-center rounded-full border px-3 text-small transition-colors";
const PILL_ON = "border-primary-400 bg-primary-100 text-primary-500";
const PILL_OFF = "border-border text-soft hover:border-neutral-300";

function ChoiceCard({
  selected,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-xl border bg-surface p-4 text-left transition-colors",
        selected ? "border-primary-400 ring-1 ring-primary-400/30" : "border-border hover:border-neutral-300",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg border",
          selected ? "border-primary-200 bg-primary-100 text-primary-500" : "border-border text-muted",
        )}
      >
        <MaybeIcon name={icon} size={22} />
      </span>
      <span className="min-w-0">
        <span className="block text-body font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-small text-muted">{description}</span>
      </span>
      {selected && <span aria-hidden className="absolute top-3 right-3 size-2.5 rounded-full bg-primary-500" />}
    </button>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="text-small font-medium text-foreground">
        {label} {hint && <span className="font-normal text-subtle">{hint}</span>}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Pill({ on, onClick, children, multi }: { on: boolean; onClick: () => void; children: ReactNode; multi?: boolean }) {
  return (
    <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} onClick={onClick} className={cn(PILL, on ? PILL_ON : PILL_OFF)}>
      {children}
    </button>
  );
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function OnboardingFlow({
  defaultName,
  mode,
  startRole,
  categories,
}: {
  defaultName: string;
  mode: "full" | "teacher";
  startRole: Role | null;
  categories: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const { user } = useUser();
  const [role, setRole] = useState<Role | null>(startRole);
  const [step, setStep] = useState<Step>(mode === "teacher" ? "teacher" : "role");
  const [answers, setAnswers] = useState<Omit<SurveyAnswers, "intent">>({
    persona: "college",
    heardFrom: null,
    heardFromOther: null,
    goals: [],
    interests: [],
    level: null,
    weeklyTime: null,
  });
  const [personaChosen, setPersonaChosen] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = useMemo(
    () => (mode === "teacher" ? ["teacher"] : ["role", "about", role === "teach" ? "teacher" : "recommend"]),
    [mode, role],
  );
  const index = steps.indexOf(step);

  /** Saves the answers (with the chosen role) and loads recommendations. */
  const submitSurvey = async (intent: Role) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...answers, intent }),
      });
      const body = (await res.json().catch(() => null)) as { recommendations?: RecommendedCourse[]; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Couldn't save your answers.");
      setRecommendations(body?.recommendations ?? []);
      // The server marked the account as onboarded; reload so the onboarding gate sees it.
      await user?.reload().catch(() => {});
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!role) return;
    const following = steps[index + 1];
    if (step === "about" && !(await submitSurvey(role))) return;
    if (following) setStep(following);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left: the steps */}
      <div className="flex w-full flex-col px-6 py-6 sm:px-12 lg:w-1/2 lg:px-16">
        <Link href="/" aria-label="Roam home" className="self-start">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {step === "role" && (
            <>
              <h1 className="text-display-2 font-bold text-foreground">How will you use Roam?</h1>
              <p className="mt-2 text-body text-muted">
                Tell us about yourself, and we&rsquo;ll tailor Roam so it best suits you.
              </p>
              <div role="radiogroup" aria-label="How will you use Roam?" className="mt-8 flex flex-col gap-3">
                <ChoiceCard
                  selected={role === "learn"}
                  icon="book-open"
                  title="I want to learn"
                  description="Take courses and track your progress."
                  onSelect={() => setRole("learn")}
                />
                <ChoiceCard
                  selected={role === "teach"}
                  icon="user"
                  title="I want to teach"
                  description="Publish your own video courses."
                  onSelect={() => setRole("teach")}
                />
              </div>
              <button type="button" disabled={!role || busy} onClick={next} className={CONTINUE}>
                {busy ? "Saving…" : "Continue"}
              </button>
            </>
          )}

          {step === "about" && (
            <>
              <h1 className="text-display-2 font-bold text-foreground">Tell us about yourself</h1>
              <p className="mt-2 text-body text-muted">A few quick questions so we can recommend the right courses.</p>
              <div className="mt-8">
                <Question label="What best describes you?">
                  {PERSONAS.map((p) => (
                    <Pill
                      key={p.value}
                      on={personaChosen && answers.persona === p.value}
                      onClick={() => {
                        setAnswers({ ...answers, persona: p.value });
                        setPersonaChosen(true);
                      }}
                    >
                      {p.label}
                    </Pill>
                  ))}
                </Question>
                <Question label="How did you hear about Roam?">
                  {HEARD_FROM.map((h) => (
                    <Pill key={h.value} on={answers.heardFrom === h.value} onClick={() => setAnswers({ ...answers, heardFrom: answers.heardFrom === h.value ? null : h.value })}>
                      {h.label}
                    </Pill>
                  ))}
                </Question>
                {answers.heardFrom === "other" && (
                  <input
                    aria-label="Where did you hear about Roam?"
                    maxLength={120}
                    value={answers.heardFromOther ?? ""}
                    onChange={(e) => setAnswers({ ...answers, heardFromOther: e.target.value })}
                    placeholder="Tell us where"
                    className="mt-2 h-9 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-subtle focus:border-primary-400 focus:outline-none"
                  />
                )}
                <Question label="What do you want to achieve?" hint="(pick any)">
                  {GOALS.map((g) => (
                    <Pill key={g.value} multi on={answers.goals.includes(g.value)} onClick={() => setAnswers({ ...answers, goals: toggle(answers.goals, g.value) })}>
                      {g.label}
                    </Pill>
                  ))}
                </Question>
                {categories.length > 0 && (
                  <Question label="Which topics interest you?" hint="(pick any)">
                    {categories.map((c) => (
                      <Pill key={c.slug} multi on={answers.interests.includes(c.slug)} onClick={() => setAnswers({ ...answers, interests: toggle(answers.interests, c.slug) })}>
                        {c.title}
                      </Pill>
                    ))}
                  </Question>
                )}
                <Question label="Your experience level">
                  {EXPERIENCE.map((x) => (
                    <Pill key={x.value} on={answers.level === x.value} onClick={() => setAnswers({ ...answers, level: answers.level === x.value ? null : x.value })}>
                      {x.label}
                    </Pill>
                  ))}
                </Question>
                <Question label="How much time per week can you learn?">
                  {WEEKLY_TIME.map((w) => (
                    <Pill key={w.value} on={answers.weeklyTime === w.value} onClick={() => setAnswers({ ...answers, weeklyTime: answers.weeklyTime === w.value ? null : w.value })}>
                      {w.label}
                    </Pill>
                  ))}
                </Question>
              </div>
              <button type="button" disabled={!personaChosen || busy} onClick={next} className={CONTINUE}>
                {busy ? "Saving…" : "Continue"}
              </button>
              <button type="button" onClick={() => setStep("role")} className="mt-3 text-small text-muted transition-colors hover:text-foreground">
                ← Back
              </button>
            </>
          )}

          {step === "recommend" && (
            <>
              <h1 className="text-display-2 font-bold text-foreground">Recommended for you</h1>
              <p className="mt-2 text-body text-muted">Courses that match what you told us. You can browse everything anytime.</p>
              <ul className="mt-8 flex flex-col gap-3">
                {recommendations.map((course) => (
                  <li key={course.slug}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-neutral-300"
                    >
                      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black">
                        {course.imageUrl ? (
                          <Image src={course.imageUrl} alt="" fill sizes="112px" className="object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-heading-2 font-semibold text-white/80">
                            {course.title.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-body font-medium text-foreground">{course.title}</span>
                        <span className="mt-0.5 block truncate text-small text-muted">
                          {[course.category, course.level, course.duration].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Icon name="arrow-right" size={18} className="ml-auto shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => router.push("/courses")} className={CONTINUE}>
                Start learning
              </button>
            </>
          )}

          {step === "teacher" && (
            <>
              <h1 className="text-display-2 font-bold text-foreground">Your teacher profile</h1>
              <p className="mt-2 text-body text-muted">
                Learners see this on your courses. Next you&rsquo;ll build your first course; an admin reviews it before it goes live.
              </p>
              <div className="mt-8">
                <TeacherProfileForm
                  initial={{ name: defaultName, headline: "", bio: "", expertise: [] }}
                  isTeacher={false}
                  next="/settings?tab=courses"
                  formClassName="flex w-full flex-col gap-4"
                  submitClassName={CONTINUE.replace("mt-6 ", "")}
                />
              </div>
            </>
          )}

          {error && <p className={FIELD_ERROR}>{error}</p>}
        </div>

        {/* Segmented progress, one bar per step */}
        <div aria-label={`Step ${index + 1} of ${steps.length}`} className="mx-auto flex w-full max-w-md gap-3 pb-4">
          {steps.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-primary-500" : "bg-neutral-200")} />
          ))}
        </div>
      </div>

      {/* Right: the pitch and an app preview (hidden on small screens) */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-neutral-50 lg:sticky lg:top-0 lg:block lg:h-screen light:bg-neutral-100">
        <div className="px-14 pt-16">
          <h2 className="max-w-xl text-display-2 font-bold text-foreground xl:text-display-1">
            Learn anything. Teach what you know.
          </h2>
          <p className="mt-4 max-w-md text-body text-muted">
            Search your courses in plain English, pick up exactly where you left off, and share your own video courses.
          </p>
        </div>
        <div className="absolute top-72 left-14 w-[150%] overflow-hidden rounded-[28px] border-[10px] border-black bg-black shadow-2xl">
          <Image src="/onboarding/preview-dark.png" alt="" width={1440} height={900} priority className="block light:hidden" />
          <Image src="/onboarding/preview-light.png" alt="" width={1440} height={900} className="hidden light:block" />
        </div>
      </aside>
    </div>
  );
}
