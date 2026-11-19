"use client";

import { useState } from "react";

import { saveOnboarding } from "@/lib/actions/onboarding";
import type { OnboardingTopic } from "@/lib/onboarding-topics";
import { createSystemAnnouncement } from "@/lib/requests/feed";
import { getMyRecommendations } from "@/lib/requests/recommendations";
import type { OnboardingAnswers } from "@/lib/validations/onboarding";
import type { AuthorizedUser, Recommendation } from "@/types";
import { OnboardingQuiz } from "./onboarding-quiz";
import { ResultsStep } from "./results-step";

interface Props {
  /** False once the student is onboarded; Results then stays up until they leave. */
  show: boolean;
  topics?: OnboardingTopic[];
  initial?: Partial<OnboardingAnswers>;
  user: AuthorizedUser;
}

type Phase = "quiz" | "saving" | "results" | "done";

export function OnboardingQuizHost({ show, topics, initial, user }: Props) {
  // Phase state survives the save's RSC refresh, which flips `show` to false.
  const [phase, setPhase] = useState<Phase>("quiz");
  const [picks, setPicks] = useState<Recommendation[]>([]);
  const [firstName, setFirstName] = useState("");

  async function onSubmit(answers: OnboardingAnswers) {
    setPhase("saving");
    const result = await saveOnboarding(answers);
    if (!result.ok) {
      setPhase("quiz");
      return result;
    }
    // Deduped server-side; a failed welcome post shouldn't undo a saved quiz.
    try {
      await createSystemAnnouncement(
        "Want to see what your friends are up to? Their activity will appear here on your feed — just head to your profile to follow them!",
        user,
      );
      await createSystemAnnouncement(
        "Hey there — welcome to Odyssey! This is where you'll see updates to your droplets, playlists, and groups.",
        user,
      );
    } catch {
      console.error("Welcome announcements failed");
    }
    // A failed fetch shows the no-picks message instead of an error.
    const recs = await getMyRecommendations({
      surface: "onboarding",
      limit: 3,
    }).catch(() => null);
    setPicks(recs?.data ?? []);
    setFirstName(answers.firstName);
    setPhase("results");
    return result;
  }

  if (phase === "done" || (phase === "quiz" && !show)) return null;
  return (
    <OnboardingQuiz
      topics={topics ?? []}
      initial={initial}
      onSubmit={onSubmit}
      results={
        phase === "results" ? (
          <ResultsStep
            picks={picks}
            firstName={firstName}
            onLeave={() => setPhase("done")}
          />
        ) : undefined
      }
    />
  );
}
