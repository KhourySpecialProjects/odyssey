import { useState, useRef } from "react";
import { IconTarget, IconTrash } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useOffClick } from "../hooks/useOffClick";
import { Button } from "@/components/ui/button";

export function LearningObjectiveDisplay({
  objective,
  update,
  remove,
}: {
  objective: string;
  update: (newObjective: string) => void;
  remove: () => void;
}) {
  const [learningObjective, setLearningObjective] = useState(objective);
  const ref = useRef<HTMLLIElement>(null);
  const { open, setOpen } = useOffClick(ref);

  const handleSave = () => {
    if (learningObjective.trim() !== objective.trim()) {
      update(learningObjective.trim());
    }
    setOpen(false);
  };

  return (
    <li
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 leading-snug",
        open ? "shadow-md" : "cursor-pointer hover:shadow",
        objective === "" ? "visibility: hidden" : "visibility: visible",
      )}
      onClick={() => (open ? null : setOpen(true))}
      ref={ref}
    >
      <IconTarget className="mr-0.5 h-5 w-5 shrink-0" stroke={1.8} />

      {open ? (
        <div className="inline-flex w-full items-center justify-between space-x-1.5">
          <Input
            value={learningObjective}
            onChange={(e) => {
              setLearningObjective(e.target.value);
            }}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 shrink-0 rounded-lg bg-red-300 text-black hover:bg-red-400 dark:bg-red-300 dark:text-black dark:hover:bg-red-400"
            type="button"
            onClick={remove}
            aria-label="Remove learning objective"
          >
            <IconTrash className="h-4 w-4" stroke={1.8} />
          </Button>
        </div>
      ) : (
        learningObjective
      )}
    </li>
  );
}
