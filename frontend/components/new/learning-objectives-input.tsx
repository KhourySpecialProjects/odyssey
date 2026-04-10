"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { LearningObjectiveDisplay } from "../draft/metadata/learning-objectives/learning-objective";
import { Input } from "../ui/input";
import { IconCornerDownLeft } from "@tabler/icons-react";
import { updateDropletLearningObjective } from "@/lib/requests/droplet";

export function LearningObjectivesInput({
  dropletId,
  learningObjectives,
  setLearningObjectives,
  className,
  firstTime,
}: {
  dropletId?: number; // Add this prop
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

  const updateLearningObjective = async (oldObj: string, newObj: string) => {
    // Update locally first for immediate feedback
    setLearningObjectives(
      learningObjectives.map((obj) => (obj === oldObj ? newObj : obj)),
    );

    // If we have a dropletId, update the backend
    if (dropletId) {
      const result = await updateDropletLearningObjective(
        dropletId,
        oldObj,
        newObj,
      );
      if (!result.success) {
        // Revert on error
        setLearningObjectives(
          learningObjectives.map((obj) => (obj === newObj ? oldObj : obj)),
        );
      }
    }
  };

  const removeLearningObjective = (obj: string) => {
    setLearningObjectives(
      learningObjectives.filter((object) => object !== obj),
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Learning Objectives{" "}
        {firstTime && <span className="text-red-500">*</span>}
      </h2>
      <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500 dark:text-slate-300">
          {learningObjectives.map((objective, index) => (
            <LearningObjectiveDisplay
              objective={objective}
              key={index}
              update={(newValue) =>
                updateLearningObjective(objective, newValue)
              }
              remove={() => removeLearningObjective(objective)}
            />
          ))}
          <li className="px-4 py-3">
            <div className="flex w-full flex-row flex-nowrap items-center justify-between space-x-1.5">
              <Input
                name="objective"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newObjective.trim() !== "") {
                      addLearningObjective(newObjective);
                    }
                  }
                }}
                placeholder="New Learning Objective..."
                className="placeholder:text-[#121216]"
                autoComplete="off"
              />
              <button
                type="button"
                aria-label="Add learning objective"
                onClick={() => {
                  if (newObjective.trim() !== "") {
                    addLearningObjective(newObjective);
                  }
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <IconCornerDownLeft className="h-5 w-5" stroke={1.8} />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
