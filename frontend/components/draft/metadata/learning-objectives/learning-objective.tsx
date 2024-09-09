import { useState, useEffect, useRef } from "react";
import { GoalIcon, LoaderIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFormStatus } from "react-dom";
import { useOffClick } from "../hooks/useOffClick";
import { DeleteButton } from "@/components/draft/metadata/form-buttons";

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
        open ? "shadow-md" : "hover:shadow cursor-pointer",
      )}
      onClick={() => (open ? null : setOpen(true))}
      ref={ref}
    >
      <GoalIcon className="w-5 h-5 mr-0.5 shrink-0" />

      {open ? (
        <div className="w-full inline-flex items-center justify-between space-x-1.5">
          <Input
            value={learningObjective}
            onChange={(e) => {
              setLearningObjective(e.target.value);
              update(e.target.value);
            }}
          />
          <form action={remove}>
            <DeleteButton />
          </form>
        </div>
      ) : (
        learningObjective
      )}
    </li>
  );
}
