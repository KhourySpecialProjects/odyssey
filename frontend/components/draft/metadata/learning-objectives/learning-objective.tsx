import { useState, useRef } from "react";
import { GoalIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useOffClick } from "../hooks/useOffClick";
import { Button } from "@lemonsqueezy/wedges";

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
      <GoalIcon className="mr-0.5 h-5 w-5 shrink-0" />

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
            className="bg-red-300 text-black dark:bg-red-300 dark:text-black"
            type="button"
            onClick={remove}
          >
            <Trash2Icon />
          </Button>
        </div>
      ) : (
        learningObjective
      )}
    </li>
  );
}
