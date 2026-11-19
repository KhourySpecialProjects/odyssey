"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AreasStep } from "@/components/onboarding/areas-step";
import { GoalStep } from "@/components/onboarding/goal-step";
import { TopicsStep } from "@/components/onboarding/topics-step";
import { Button } from "@/components/ui/button";
import { saveLearningInterests } from "@/lib/actions/onboarding";
import type { OnboardingTopic } from "@/lib/onboarding-topics";
import {
  areasStepSchema,
  goalStepSchema,
  topicsStepSchema,
  type OnboardingDraft,
} from "@/lib/validations/onboarding";

const schema = goalStepSchema.merge(areasStepSchema).merge(topicsStepSchema);

interface LearningInterestsProps {
  topics: OnboardingTopic[];
  initial: Pick<
    OnboardingDraft,
    "goal" | "focusAreas" | "interestTagIds" | "interestNote"
  >;
}

export function LearningInterests({ topics, initial }: LearningInterestsProps) {
  const [draft, setDraft] = useState<OnboardingDraft>({
    focusAreas: [],
    interestTagIds: [],
    ...initial,
  });
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const patch = (p: OnboardingDraft) => setDraft((d) => ({ ...d, ...p }));
  const parsed = schema.safeParse(draft);
  const fieldErrors: Record<string, string | undefined> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
  }
  const errors = attempted ? fieldErrors : {};

  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!parsed.success) return setAttempted(true);
    setPending(true);
    setError("");
    try {
      const result = await saveLearningInterests(parsed.data);
      if (result.ok) toast.success("Saved. Your recommendations will update.");
      else setError(result.error);
    } catch {
      setError("We couldn't save your answers. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-10 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-white">
          Learning interests
        </h2>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          We use these to suggest droplets you will want to take.
        </p>
      </div>
      <GoalStep
        value={draft.goal}
        onChange={(goal) => patch({ goal })}
        error={errors.goal}
      />
      <AreasStep
        value={draft.focusAreas ?? []}
        onChange={(focusAreas) => patch({ focusAreas })}
        error={errors.focusAreas}
      />
      <TopicsStep
        topics={topics}
        focusAreas={draft.focusAreas ?? []}
        value={draft.interestTagIds ?? []}
        onChange={(interestTagIds) => patch({ interestTagIds })}
        note={draft.interestNote}
        onNoteChange={(interestNote) => patch({ interestNote })}
        defaultNoteOpen={!!initial.interestNote}
        errors={{ topics: errors.interestTagIds, note: errors.interestNote }}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
