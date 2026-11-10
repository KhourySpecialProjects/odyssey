"use client";

import { useState } from "react";

import { RubricChip } from "@/components/admin/scorecard-prompts/rubric-chip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Criterion } from "@/lib/ai-review/types";
import {
  systemPromptSections,
  type PromptLevel,
  type PromptParts,
} from "@/lib/ai-review/system-prompt";
import type { PanelCriterion } from "@/lib/requests/reviews";
import { cn } from "@/lib/utils";

const toCriterion = (c: PanelCriterion): Criterion => ({
  id: c.id,
  name: c.name,
  lessonDescription: c.lessonDescription ?? "",
  overallDescription: c.overallDescription ?? "",
});

export function PromptPreview({
  parts,
  criteria,
}: {
  parts: PromptParts;
  criteria: PanelCriterion[] | null;
}) {
  const [level, setLevel] = useState<PromptLevel>("lesson");
  const sections = systemPromptSections(
    parts,
    level,
    (criteria ?? []).map(toCriterion),
  );

  return (
    <Collapsible className="space-y-3">
      <CollapsibleTrigger className="text-sm font-medium underline-offset-4 hover:underline">
        Preview prompt
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3">
        <ToggleGroup
          type="single"
          value={level}
          onValueChange={(v) => v && setLevel(v as PromptLevel)}
          aria-label="Prompt level"
        >
          <ToggleGroupItem value="lesson">Lesson</ToggleGroupItem>
          <ToggleGroupItem value="overall">Overall</ToggleGroupItem>
        </ToggleGroup>
        {sections.map((s, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md p-3 text-sm whitespace-pre-wrap",
              s.kind === "fixed" && "bg-slate-100 dark:bg-slate-800",
            )}
          >
            {s.kind === "fixed" && (
              <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                Fixed
              </span>
            )}
            {s.kind === "rubric" ? (
              <RubricChip criteria={criteria} level={level} />
            ) : (
              s.text
            )}
          </div>
        ))}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Droplet content isn&apos;t shown.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
