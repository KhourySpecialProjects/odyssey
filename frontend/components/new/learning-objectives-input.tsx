"use client";

import { Button } from "../ui/button";
import { Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { updateDroplet } from "@/lib/actions";
import { LearningObjectiveDisplay } from "../draft/metadata/learning-objectives/learning-objective";
import { Input } from "../ui/input";
import { AddButton } from "../draft/metadata/form-buttons";

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
        "select-none w-min flex flex-col items-start justify-center",
        className,
      )}
    >
      <div className="w-full flex items-center justify-between mb-0">
        <div>
          <h2 className="font-semibold text-sm">
            Learning Objectives{" "}
            {firstTime && <span className="text-red-500">*</span>}
          </h2>
          <p className="text-slate-500 mb-4 text-sm dark:text-slate-300">
            By completing this Droplet, you should:
          </p>
        </div>
      </div>
      <div className="w-full space-y-1.5 h-40 overflow-y-scroll rounded p-2">
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
          <li className="px-4 py-3 ">
            <div className="flex flex-row items-center justify-between flex-nowrap w-full space-x-1.5">
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
              <AddButton />
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
