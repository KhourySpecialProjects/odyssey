import { useState, useRef } from "react";
import { GoalIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useOffClick } from "../hooks/useOffClick";
import { DeleteButton } from "@/components/draft/metadata/form-buttons";
import { Button } from "@lemonsqueezy/wedges";

export function LearningObjectiveDisplay({
  objective,
  update,
  remove,
}: {
  objective: string;
  update: (objective: string) => void;
  remove: () => void;
}) {
  const [learningObjective, setLearningObjective] = useState(objective);
  const ref = useRef<HTMLLIElement>(null);
  const { open, setOpen } = useOffClick(ref);

  return (
    <li
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 leading-snug",
        open ? "shadow-md" : "cursor-pointer hover:shadow",
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
              update(e.target.value);
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
