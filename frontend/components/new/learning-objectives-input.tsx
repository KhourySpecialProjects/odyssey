"use client";

import { Button } from "../ui/button";
import { Trash } from "lucide-react";
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
      setLearningObjectives([...learningObjectives, ""]);
    }
  }
  return (
    <div
      className={cn(
        "select-none w-min flex flex-col items-start justify-center",
        className,
      )}
    >
      <div className="w-full flex items-center justify-between mb-0">
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
        {learningObjectives.map((objective, index) => (
          <div
            key={index}
            className="w-full flex flex-row justify-between items-center relative rounded-md gap-1"
          >
            <input
              id={`learning-objective-${index}`}
              name={`learning-objective-${index}`}
              value={objective}
              placeholder="New Learning Objective"
              autoComplete="off"
              className="w-full text-sm rounded-md border-1 dark:bg-black border-slate-200 outline-0 focus:outline-none focus:ring-0 dark:focus:outline-none dark:focus:ring-0 ring-0 focus:border-slate-200 focus-visible:outline-none focus-visible:ring-0 px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!learningObjectives.includes("")) {
                    setLearningObjectives([...learningObjectives, ""]);
                  }
                }
              }}
              onChange={(e) => {
                const newObjectives = [...learningObjectives];
                newObjectives[index] = e.target.value;
                setLearningObjectives(newObjectives);
              }}
            />
            <Trash
              width={37}
              height={37}
              role="delete"
              className="text-slate-500 hover:text-slate-600 bg-slate-200 cursor-pointer rounded-md border border-slate-200 p-1.5"
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
