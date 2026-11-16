"use client";

import { Briefcase, Compass, GraduationCap, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import type { Goal } from "@/lib/validations/onboarding";
import { OptionCard } from "./option-card";

const GOAL_OPTIONS: {
  value: Goal;
  title: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    value: "class",
    title: "A class assigned it",
    hint: "My course or group uses Odyssey",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: "career",
    title: "Getting ready for co-op or a job",
    hint: "Interviews, resumes and the skills employers ask for",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: "self",
    title: "Learning on my own",
    hint: "I want to pick up something new",
    icon: <Compass className="h-4 w-4" />,
  },
  {
    value: "browsing",
    title: "Just looking around",
    hint: "Show me a bit of everything",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

export function GoalStep({
  value,
  onChange,
}: {
  value?: Goal;
  onChange: (goal: Goal) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Why you are here" className="grid gap-2">
      {GOAL_OPTIONS.map((o) => (
        <OptionCard
          key={o.value}
          role="radio"
          title={o.title}
          hint={o.hint}
          icon={o.icon}
          selected={value === o.value}
          onClick={() => onChange(o.value)}
        />
      ))}
    </div>
  );
}
