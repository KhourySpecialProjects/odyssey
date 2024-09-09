"use client";

import { Button } from "../ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LearningObjectivesInput({
  learningObjectives,
  setLearningObjectives,
  className,
}: {
  learningObjectives: string[];
  setLearningObjectives: (learningObjectives: string[]) => void;
  className?: string;
}) {
  function addEmptyLearningObjective() {
    if (!learningObjectives.includes("")) {
      setLearningObjectives(["", ...learningObjectives]);
    }
  }
  return (
    <div
      className={cn(
        "select-none w-min flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className="w-56 flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm">Learning Objectives</h2>
        <Button
          type="button"
          onClick={addEmptyLearningObjective}
          size="sm"
          className="text-lg"
        >
          {" "}
          +{" "}
        </Button>
      </div>
      <div className="space-y-1.5 h-40 overflow-y-scroll border border-slate-100 rounded p-2">
        {learningObjectives.map((objective, index) => (
          <div
            key={index}
            className="w-56 flex flex-row justify-between items-center relative rounded-md border border-slate-200"
          >
            <input
              id={`learning-objective-${index}`}
              name={`learning-objective-${index}`}
              value={objective}
              placeholder="New Learning Objective"
              autoComplete="off"
              className="w-56 text-sm rounded-md border-0 outline-0 ring-0 focus-visible:ring-0 focus-visible:outline-2 px-3 py-2 "
              onChange={(e) => {
                const newObjectives = [...learningObjectives];
                newObjectives[index] = e.target.value;
                setLearningObjectives(newObjectives);
              }}
            />
            <XIcon
              className="text-red-500 hover:text-red-600 cursor-pointer mr-1"
              onClick={() => {
                const newObjectives = [...learningObjectives];
                newObjectives.splice(index, 1);
                setLearningObjectives(newObjectives);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
