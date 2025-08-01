"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { LearningObjectiveDisplay } from "../draft/metadata/learning-objectives/learning-objective";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CornerDownLeft } from "lucide-react";

export function LearningObjectivesInput({
  learningObjectives,
  setLearningObjectives,
  className,
  firstTime,
}: {
  learningObjectives: string[];
  setLearningObjectives: (learningObjectives: string[]) => void;
  className?: string;
  firstTime?: boolean;
}) {
  const [newObjective, setNewObjective] = useState("");

  const addLearningObjective = (obj: string) => {
    setLearningObjectives([...learningObjectives, obj]);
    setNewObjective("");
  };

  const removeLearningObjective = (obj: string) => {
    setLearningObjectives(
      learningObjectives.filter((object) => object !== obj),
    );
  };

  return (
    <div
      className={cn(
        "flex w-min flex-col items-start justify-center select-none",
        className,
      )}
    >
      <div className="mb-0 flex w-full items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            Learning Objectives{" "}
            {firstTime && <span className="text-red-500">*</span>}
          </h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-300">
            By completing this Droplet, you should:
          </p>
        </div>
      </div>
      <div className="h-40 w-full space-y-1.5 overflow-y-scroll rounded p-2">
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 10px;
          }
          div::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          div::-webkit-scrollbar-thumb {
            background-color: #888;
            border-radius: 10px;
            border: 2px solid #f1f1f1;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}</style>
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500 dark:text-slate-300">
          {learningObjectives.map((objective, index) => (
            <LearningObjectiveDisplay
              objective={objective}
              key={index}
              update={() => addLearningObjective(objective)}
              remove={() => removeLearningObjective(objective)}
            />
          ))}
          <li className="px-4 py-3">
            <div className="flex w-full flex-row flex-nowrap items-center justify-between space-x-1.5">
              <Input
                name="objective"
                value={newObjective}
                onChange={(e) => {
                  setNewObjective(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newObjective.trim() !== "") {
                      addLearningObjective(newObjective);
                    }
                  }
                }}
                placeholder="New Learning Objective..."
                autoComplete="off"
              />
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  if (newObjective.trim() !== "") {
                    addLearningObjective(newObjective);
                  }
                }}
              >
                <CornerDownLeft />
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
