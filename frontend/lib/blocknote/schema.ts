"use client";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { Callout } from "@/components/ui/blocknote/blocks/callout-block";
import { TrueFalseQuiz } from "@/components/ui/blocknote/blocks/quiz-true-false-block";
import { OpenEndedQuiz } from "@/components/ui/blocknote/blocks/quiz-open-ended-block";
import { MultipleChoiceQuiz } from "@/components/ui/blocknote/blocks/quiz-multiple-choice-block";

export const blockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout(),
    "quiz-true-false": TrueFalseQuiz(),
    "quiz-open-ended": OpenEndedQuiz(),
    "quiz-multiple-choice": MultipleChoiceQuiz(),
  },
});
