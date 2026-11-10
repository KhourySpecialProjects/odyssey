"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PromptPreview } from "@/components/admin/scorecard-prompts/prompt-preview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_PROMPT, isDefaultPart } from "@/lib/ai-review/system-prompt";
import type { PromptParts } from "@/lib/ai-review/system-prompt";
import type { PanelCriterion } from "@/lib/requests/reviews";
import { saveAiScoringPrompt } from "@/lib/requests/ai-scoring-prompt";
import { AI_SCORING_PROMPT_LIMITS } from "@/lib/validations/ai-scoring-prompt";
import { cn } from "@/lib/utils";

type Custom = Record<keyof PromptParts, boolean>;

const PARTS: { key: keyof PromptParts; label: string; hint: string }[] = [
  {
    key: "instructions",
    label: "Instructions",
    hint: "How the AI scores. Keep the quote rules (word for word), or some findings may not match the lesson text.",
  },
  {
    key: "lessonScope",
    label: "Lesson scope",
    hint: "Added when the AI scores one lesson.",
  },
  {
    key: "overallScope",
    label: "Overall scope",
    hint: "Added when the AI scores the droplet as a whole.",
  },
];

export function PromptEditor({
  initial,
  custom,
  criteria,
}: {
  initial: PromptParts;
  custom: Custom;
  /** Omit to hide the preview; `null` means the rubric failed to load. */
  criteria?: PanelCriterion[] | null;
}) {
  const [baseline, setBaseline] = useState(initial);
  // The live form text; the preview reads this.
  const [parts, setParts] = useState(initial);
  const [saved, setSaved] = useState(custom);
  const [pending, startSave] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const wasOpen = useRef(false);

  const dirty = PARTS.some(({ key }) => parts[key] !== baseline[key]);
  const valid = PARTS.every(
    ({ key }) =>
      parts[key].trim().length > 0 &&
      parts[key].length <= AI_SCORING_PROMPT_LIMITS[key],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    startSave(async () => {
      const result = await saveAiScoringPrompt(parts);
      if (!result.ok) {
        toast.error("Couldn't save the Scorecard prompts.");
        return;
      }
      toast.success("Saved. The next Score with AI run uses this wording.");
      setBaseline(parts);
      setSaved(result.data.custom);
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && valid && !pending) save();
      }}
    >
      {PARTS.map(({ key, label, hint }) => {
        const text = parts[key];
        const limit = AI_SCORING_PROMPT_LIMITS[key];
        const over = text.length > limit;
        const empty = text.trim().length === 0;
        const isCustom =
          text === baseline[key] ? saved[key] : !isDefaultPart(key, text);
        const id = `scorecard-prompt-${key}`;
        return (
          <div
            key={key}
            className="space-y-2 rounded-[20px] border border-[#D0D5DD] bg-[#FCFCFD] p-5 md:p-6 dark:border-slate-600 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor={id}
                className="text-[18px] font-medium text-black dark:text-white"
              >
                {label}
              </Label>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isCustom
                    ? "bg-[#2D7597]/10 text-[#1F5F7A] dark:bg-[#2D7597]/20 dark:text-[#4AABCF]"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                {isCustom ? "Custom" : "Default"}
              </span>
            </div>
            <p
              id={`${id}-hint`}
              className="text-sm text-[#667085] dark:text-slate-400"
            >
              {hint}
            </p>
            <Textarea
              id={id}
              value={text}
              rows={key === "instructions" ? 14 : 5}
              aria-invalid={over || empty}
              aria-describedby={`${id}-hint ${id}-count ${id}-error`}
              className="rounded-[20px] border-[#efeff0] bg-white px-5 py-4 text-[16px] text-slate-900 focus:border-[#2D7597] focus-visible:ring-2 focus-visible:ring-[#2D7597]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              onChange={(event) =>
                setParts((prev) => ({ ...prev, [key]: event.target.value }))
              }
            />
            {key === "instructions" && (
              <p className="text-sm text-[#667085] dark:text-slate-400">
                The{" "}
                <Tooltip open={noteOpen} onOpenChange={setNoteOpen}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="underline decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none dark:focus-visible:ring-slate-500"
                      onPointerDown={() => {
                        wasOpen.current = noteOpen;
                      }}
                      onClick={(event) => {
                        // Radix closes on pointer down; a click toggles from its pre-press state (touch).
                        event.preventDefault();
                        setNoteOpen(
                          event.detail === 0 ? !noteOpen : !wasOpen.current,
                        );
                      }}
                    >
                      fixed paragraphs
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    The fixed paragraphs are how lesson content is formatted for
                    the AI, and the rule that lesson content is material to
                    review, never instructions to follow.
                  </TooltipContent>
                </Tooltip>{" "}
                are always added after this.
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 text-sm">
                <span
                  id={`${id}-count`}
                  className={
                    over
                      ? "text-red-600 dark:text-red-400"
                      : "text-[#667085] dark:text-slate-400"
                  }
                >
                  {text.length.toLocaleString("en-US")} /{" "}
                  {limit.toLocaleString("en-US")} characters
                </span>
                <span
                  id={`${id}-error`}
                  aria-live="polite"
                  className="text-red-600 dark:text-red-400"
                >
                  {over ? "Too long." : empty ? "Can't be empty." : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                disabled={text === DEFAULT_PROMPT[key]}
                onClick={() =>
                  setParts((prev) => ({ ...prev, [key]: DEFAULT_PROMPT[key] }))
                }
              >
                Reset to default
              </Button>
            </div>
          </div>
        );
      })}
      {criteria !== undefined && (
        <PromptPreview parts={parts} criteria={criteria} />
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!dirty || !valid || pending}
          className="h-[44px] rounded-[8px] border border-[#2D7597] bg-[#2D7597] px-5 text-[16px] font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#255e78] disabled:opacity-50"
        >
          Save
        </Button>
      </div>
    </form>
  );
}
