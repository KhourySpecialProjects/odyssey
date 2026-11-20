"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OnboardingTopic } from "@/lib/onboarding-topics";
import { isTimeZone } from "@/lib/time-zones";
import {
  areasStepSchema,
  goalStepSchema,
  onboardingAnswersSchema,
  profileStepSchema,
  topicsStepSchema,
  type OnboardingAnswers,
  type OnboardingDraft,
} from "@/lib/validations/onboarding";
import { AreasStep } from "./areas-step";
import { GoalStep } from "./goal-step";
import { ProfileStep } from "./profile-step";
import { QuizProgress } from "./quiz-progress";
import { TopicsStep } from "./topics-step";

const STEPS = [
  {
    schema: profileStepSchema,
    title: "Welcome to Khoury Odyssey!",
    hint: "First, a little about you. Then three quick questions so we can suggest droplets you'll actually want to take.",
  },
  {
    schema: goalStepSchema,
    title: "What brings you to Odyssey?",
    hint: "Pick the one that fits best.",
  },
  {
    schema: areasStepSchema,
    title: "Which areas interest you?",
    hint: "Choose any that apply. These match the Focus Areas on Explore.",
  },
  {
    schema: topicsStepSchema,
    title: "Pick a few topics",
    hint: "Choose at least one. Your areas come first.",
  },
];

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export interface OnboardingQuizProps {
  topics: OnboardingTopic[];
  initial?: Partial<OnboardingAnswers>;
  /** Saves the answers; on `ok: false` the quiz stays open with the error. */
  onSubmit: (answers: OnboardingAnswers) => Promise<OnboardingResult>;
}

function browserTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isTimeZone(tz) ? tz : undefined;
  } catch {
    return undefined;
  }
}

export function OnboardingQuiz({
  topics,
  initial,
  onSubmit,
}: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    firstName: "",
    lastName: "",
    bio: "",
    focusAreas: [],
    interestTagIds: [],
    ...initial,
    timeZone: isTimeZone(initial?.timeZone)
      ? initial?.timeZone
      : browserTimeZone(),
  }));
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const patch = (p: OnboardingDraft) => setDraft((d) => ({ ...d, ...p }));
  const last = step === STEPS.length - 1;
  const parsed = STEPS[step].schema.safeParse(draft);
  const fieldErrors: Record<string, string | undefined> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
  }
  const errors = attempted ? fieldErrors : {};

  function go(to: number) {
    setStep(to);
    setAttempted(false);
    setError("");
  }

  async function next(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!parsed.success) return setAttempted(true);
    if (!last) return go(step + 1);
    const answers = onboardingAnswersSchema.safeParse(draft);
    if (!answers.success) return setError("Some answers are missing.");
    setSubmitting(true);
    setError("");
    try {
      const result = await onSubmit(answers.data);
      if (!result.ok) setError(result.error);
    } catch {
      setError("We couldn't save your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            heading.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800"
        >
          <form onSubmit={next} className="space-y-4">
            <QuizProgress step={step + 1} total={STEPS.length} />
            <div>
              <DialogTitle
                ref={heading}
                tabIndex={-1}
                className="text-xl font-bold outline-none"
              >
                {STEPS[step].title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {STEPS[step].hint}
              </DialogDescription>
            </div>
            {step === 0 && (
              <ProfileStep value={draft} onChange={patch} errors={errors} />
            )}
            {step === 1 && (
              <GoalStep
                value={draft.goal}
                onChange={(goal) => patch({ goal })}
                error={errors.goal}
              />
            )}
            {step === 2 && (
              <AreasStep
                value={draft.focusAreas ?? []}
                onChange={(focusAreas) => patch({ focusAreas })}
                error={errors.focusAreas}
              />
            )}
            {step === 3 && (
              <TopicsStep
                topics={topics}
                focusAreas={draft.focusAreas ?? []}
                value={draft.interestTagIds ?? []}
                onChange={(interestTagIds) => patch({ interestTagIds })}
                note={draft.interestNote}
                onNoteChange={(interestNote) => patch({ interestNote })}
                errors={{
                  topics: errors.interestTagIds,
                  note: errors.interestNote,
                }}
              />
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between border-t pt-4">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => go(step - 1)}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-onboarding hover:bg-onboarding/90 text-white"
              >
                {submitting
                  ? "Saving…"
                  : last
                    ? "See my recommendations"
                    : "Continue"}
                {!last && !submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-center text-xs text-slate-500">
              Takes about a minute. You can change your answers later in
              Settings.
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
