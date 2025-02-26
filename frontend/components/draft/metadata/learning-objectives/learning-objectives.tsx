"use client";

import { useState } from "react";
import { useDropletUpdate } from "../hooks/useDropletUpdate";
import { Input } from "@/components/ui/input";
import { LearningObjectiveDisplay } from "@/components/draft/metadata/learning-objectives/learning-objective";
import { updateDroplet } from "@/lib/actions";
import { LearningObjective } from "@/types";
import { AddButton } from "../form-buttons";

export function LearningObjectives({
  dropletId,
  learningObjectives,
}: {
  dropletId: number;
  learningObjectives: LearningObjective[];
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);
  const [newObjective, setNewObjective] = useState("");

  const addLearningObjective = async (formData: FormData) => {
    const objective = (formData.get("objective") as string).trim();
    if (objective === "") return;
    const response = await updateDroplet(dropletId, {
      learningObjectives: [
        ...learningObjectives.map((obj) => obj.objective),
        objective,
      ],
    });
    if (!response.error && response.data) {
      setNewObjective("");
    }
  };

  const updateLearningObjective = (id: number) => {
    return (objective: string) => {
      const newLearningObjectives = [...learningObjectives];
      newLearningObjectives.filter((obj) => obj.id == id)[0].objective =
        objective;
      handleChange({
        learningObjectives: newLearningObjectives.map((obj) => obj.objective),
      });
    };
  };

  const removeLearningObjective = (id: number) => {
    return async () => {
      const newLearningObjectives = [...learningObjectives].filter(
        (obj) => obj.id != id,
      );
      const response = await updateDroplet(dropletId, {
        learningObjectives: newLearningObjectives.map((obj) => obj.objective),
      });
    };
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2 dark:text-white">
        Learning Objectives
      </h2>
      <p className="text-slate-500 mb-4 dark:text-slate-300">
        By completing this Droplet, you should:
      </p>
      <div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200">
        <ul className="flex flex-col divide-y divide-slate-200">
          {learningObjectives.map((objective) => (
            <LearningObjectiveDisplay
              objective={objective.objective}
              key={objective.id}
              update={updateLearningObjective(objective.id)}
              remove={removeLearningObjective(objective.id)}
            />
          ))}
          <li className="px-4 py-3 ">
            <form
              action={addLearningObjective}
              className="flex flex-row items-center justify-between flex-nowrap w-full space-x-1.5"
            >
              <Input
                name="objective"
                value={newObjective}
                onChange={(e) => {
                  setNewObjective(e.target.value);
                }}
                placeholder="New Learning Objective..."
                autoComplete="off"
              />
              <AddButton />
            </form>
          </li>
        </ul>
      </div>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}
