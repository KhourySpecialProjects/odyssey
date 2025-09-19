"use client";

import { Resource } from "@/types";
import { useRef, useState } from "react";
import { useOffClick } from "../hooks/useOffClick";
import { cn } from "@/lib/utils";
import { Link2Icon } from "lucide-react";
import { DeleteButton } from "@/components/draft/metadata/form-buttons";
import { Input } from "@/components/ui/input";

export function NextStepDisplay({
  initial,
  update,
  remove,
}: {
  initial: Resource;
  update: (nextStep: Resource) => void;
  remove: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { open, setOpen } = useOffClick(ref);
  const [nextStep, setNextStep] = useState(initial);

  return (
    <li
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 leading-snug",
        open ? "shadow-md" : "cursor-pointer hover:shadow",
      )}
      onClick={() => (open ? null : setOpen(true))}
      ref={ref}
    >
      <Link2Icon className="mr-0.5 h-5 w-5 shrink-0" />

      {open ? (
        <div className="inline-flex w-full items-center justify-between space-x-1.5">
          <Input
            value={nextStep.label}
            onChange={(e) => {
              setNextStep({
                id: nextStep.id,
                url: nextStep.url,
                label: e.target.value,
              });
              update({
                id: nextStep.id,
                url: nextStep.url,
                label: e.target.value,
              });
            }}
          />
          <Input
            value={nextStep.url}
            onChange={(e) => {
              setNextStep({
                id: nextStep.id,
                url: e.target.value,
                label: nextStep.label,
              });
              update({
                id: nextStep.id,
                url: e.target.value,
                label: nextStep.label,
              });
            }}
          />

          <form action={remove}>
            <DeleteButton />
          </form>
        </div>
      ) : (
        (nextStep.label ?? nextStep.url)
      )}
    </li>
  );
}
