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

export const ONBOARDING_STORAGE_KEY = "odyssey:onboarding-quiz";

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

export interface OnboardingQuizProps {
  topics: OnboardingTopic[];
  initialProfile?: {
    first?: string;
    last?: string;
    bio?: string;
    timeZone?: string;
  };
  /** Saves the answers; a rejection keeps the quiz open on the last step. */
  onSubmit: (answers: OnboardingAnswers) => Promise<void>;
}

function browserTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isTimeZone(tz) ? tz : undefined;
  } catch {
    return undefined;
  }
}

function readSaved(): { step: number; draft: OnboardingDraft } | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function OnboardingQuiz({
  topics,
  initialProfile,
  onSubmit,
}: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    first: initialProfile?.first ?? "",
    last: initialProfile?.last ?? "",
    bio: initialProfile?.bio ?? "",
    timeZone: isTimeZone(initialProfile?.timeZone)
      ? initialProfile?.timeZone
      : browserTimeZone(),
    focusAreas: [],
    interests: [],
  }));
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setDraft((d) => ({ ...d, ...saved.draft }));
      setStep(Math.min(Math.max(saved.step, 0), STEPS.length - 1));
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ step, draft }),
      );
    } catch {
      // Storage can be blocked; the quiz still works without it.
    }
  }, [restored, step, draft]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const patch = (p: OnboardingDraft) => setDraft((d) => ({ ...d, ...p }));
  const last = step === STEPS.length - 1;
  const valid = STEPS[step].schema.safeParse(draft).success;

  async function next(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    if (!last) return setStep(step + 1);
    const answers = onboardingAnswersSchema.safeParse(draft);
    if (!answers.success) return setError("Some answers are missing.");
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(answers.data);
      try {
        sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch {
        // The answers are saved; a failed cleanup is not an error.
      }
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
            {step === 0 && <ProfileStep value={draft} onChange={patch} />}
            {step === 1 && (
              <GoalStep
                value={draft.goal}
                onChange={(goal) => patch({ goal })}
              />
            )}
            {step === 2 && (
              <AreasStep
                value={draft.focusAreas ?? []}
                onChange={(focusAreas) => patch({ focusAreas })}
              />
            )}
            {step === 3 && (
              <TopicsStep
                topics={topics}
                focusAreas={draft.focusAreas ?? []}
                value={draft.interests ?? []}
                onChange={(interests) => patch({ interests })}
                note={draft.interestNote}
                onNoteChange={(interestNote) => patch({ interestNote })}
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
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!valid || submitting}
                className="bg-[#2f7a9a] text-white hover:bg-[#2f7a9a]/90"
              >
                {last ? "Finish" : "Next"}
                {!last && <ArrowRight className="h-4 w-4" />}
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
