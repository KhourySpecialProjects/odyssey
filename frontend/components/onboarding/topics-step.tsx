"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { OnboardingTopic } from "@/lib/onboarding-topics";
import { FOCUS_AREAS, type FocusArea } from "@/lib/validations/onboarding";
import { AREA_LABELS } from "./areas-step";
import { ChipGroup } from "./chip-group";

interface TopicsStepProps {
  topics: OnboardingTopic[];
  focusAreas: FocusArea[];
  value: string[];
  onChange: (ids: string[]) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
}

export function TopicsStep({
  topics,
  focusAreas,
  value,
  onChange,
  note = "",
  onNoteChange,
}: TopicsStepProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  const areaGroup = (area: FocusArea, muted?: boolean) => {
    const own = topics.filter((t) => t.area === area);
    if (!own.length) return null;
    return (
      <section key={area} className="space-y-2">
        <h3 className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {AREA_LABELS[area]}
        </h3>
        <ChipGroup
          label={AREA_LABELS[area]}
          muted={muted}
          options={own.map((t) => ({ value: t.documentId, label: t.name }))}
          selected={value}
          onToggle={toggle}
        />
      </section>
    );
  };
  const mine = FOCUS_AREAS.filter((a) => focusAreas.includes(a));
  const others = FOCUS_AREAS.filter((a) => !focusAreas.includes(a));
  return (
    <div className="space-y-4">
      {mine.map((a) => areaGroup(a))}
      {others.length > 0 && (
        <details>
          <summary className="text-onboarding cursor-pointer text-xs font-medium">
            More topics
          </summary>
          <div className="mt-3 space-y-4">
            {others.map((a) => areaGroup(a, true))}
          </div>
        </details>
      )}
      <p aria-live="polite" className="text-onboarding text-xs">
        {value.length} selected
      </p>
      {onNoteChange && (
        <div>
          <button
            type="button"
            aria-expanded={noteOpen}
            onClick={() => setNoteOpen((o) => !o)}
            className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
          >
            Anything specific you want to learn? (optional)
          </button>
          {noteOpen && (
            <Input
              aria-label="Anything specific you want to learn?"
              className="mt-2"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}
