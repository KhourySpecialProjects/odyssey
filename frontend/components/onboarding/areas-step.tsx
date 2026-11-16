"use client";

import { Code2, Heart, Users } from "lucide-react";
import type { ReactNode } from "react";

import type { FocusArea } from "@/lib/validations/onboarding";
import { OptionCard } from "./option-card";

export const AREA_LABELS: Record<FocusArea, string> = {
  technical: "Technical",
  professional: "Professional",
  personal: "Personal",
};

const AREA_OPTIONS: { value: FocusArea; hint: string; icon: ReactNode }[] = [
  {
    value: "technical",
    hint: "Programming, web, data, cloud, CAD",
    icon: <Code2 className="h-4 w-4" />,
  },
  {
    value: "professional",
    hint: "Interviews, resumes, networking, product",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "personal",
    hint: "Academic planning, ethics, time management",
    icon: <Heart className="h-4 w-4" />,
  },
];

export function AreasStep({
  value,
  onChange,
}: {
  value: FocusArea[];
  onChange: (areas: FocusArea[]) => void;
}) {
  const toggle = (a: FocusArea) =>
    onChange(value.includes(a) ? value.filter((v) => v !== a) : [...value, a]);
  return (
    <div role="group" aria-label="Areas" className="grid gap-2">
      {AREA_OPTIONS.map((o) => (
        <OptionCard
          key={o.value}
          title={AREA_LABELS[o.value]}
          hint={o.hint}
          icon={o.icon}
          selected={value.includes(o.value)}
          onClick={() => toggle(o.value)}
        />
      ))}
    </div>
  );
}
