"use client";

import { useState, useEffect } from "react";
import { useDropletUpdate } from "../hooks/useDropletUpdate";
import { Input } from "@/components/ui/input";
import { LearningObjectiveDisplay } from "@/components/draft/metadata/learning-objectives/learning-objective";
import { LearningObjective } from "@/types";
import { AddButton } from "../form-buttons";
import { updateDroplet } from "@/lib/requests/droplet";

export function LearningObjectives({
  dropletId,
  learningObjectives,
}: {
  dropletId: number;
  learningObjectives: LearningObjective[];
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);
  const storageKey = `droplet-${dropletId}-draft-objective`;

  // Load from localStorage on mount
  const [newObjective, setNewObjective] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setNewObjective(saved);
    }
  }, [storageKey]);

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
      localStorage.removeItem(storageKey); // Clear draft after adding
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
      await updateDroplet(dropletId, {
        learningObjectives: newLearningObjectives.map((obj) => obj.objective),
      });
    };
  };

  const handleDraftChange = (value: string) => {
    setNewObjective(value);
    if (value.trim()) {
      localStorage.setItem(storageKey, value);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Learning Objectives
      </h2>
      <p className="mt-1 text-slate-500 dark:text-slate-300">
        By completing this Droplet, you should:
      </p>
      <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500 dark:text-slate-300">
          {learningObjectives.map((objective) => (
            <LearningObjectiveDisplay
              objective={objective.objective}
              key={objective.id}
              update={updateLearningObjective(objective.id)}
              remove={removeLearningObjective(objective.id)}
            />
          ))}
          <li className="px-4 py-3">
            <form
              action={addLearningObjective}
              className="flex w-full flex-row flex-nowrap items-center justify-between space-x-1.5"
            >
              <Input
                name="objective"
                value={newObjective}
                onChange={(e) => {
                  handleDraftChange(e.target.value);
                }}
                placeholder="New Learning Objective..."
                autoComplete="off"
              />
              <AddButton />
            </form>
          </li>
        </ul>
      </div>
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
}
