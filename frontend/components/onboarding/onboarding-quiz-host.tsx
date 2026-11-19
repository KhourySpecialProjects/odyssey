"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveOnboarding } from "@/lib/actions/onboarding";
import type { OnboardingTopic } from "@/lib/onboarding-topics";
import { createSystemAnnouncement } from "@/lib/requests/feed";
import type { OnboardingAnswers } from "@/lib/validations/onboarding";
import type { AuthorizedUser } from "@/types";
import { OnboardingQuiz } from "./onboarding-quiz";

interface Props {
  topics: OnboardingTopic[];
  initial: Partial<OnboardingAnswers>;
  user: AuthorizedUser;
}

export function OnboardingQuizHost({ topics, initial, user }: Props) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  async function onSubmit(answers: OnboardingAnswers) {
    const result = await saveOnboarding(answers);
    if (!result.ok) return result;
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
    setOpen(false);
    router.refresh();
    return result;
  }

  if (!open) return null;
  return (
    <OnboardingQuiz topics={topics} initial={initial} onSubmit={onSubmit} />
  );
}
