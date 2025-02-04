"use client";

import { DROPLET_FILTERS } from "@/lib/globals";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDropletUpdate } from "./hooks/useDropletUpdate";

export function Filter({
  dropletId,
  initial,
  variant,
}: {
  dropletId: number;
  initial: string;
  variant: "focusArea" | "type";
}) {
  const index = variant == "focusArea" ? 0 : 1;
  const { handleChange } = useDropletUpdate(dropletId);

  const update = (val: string) => {
    if (variant == "focusArea") {
      handleChange({ focusArea: val });
    } else {
      handleChange({ type: val });
    }
  };

  return (
    <div>
      <h1 className="font-bold text-sm text-slate-900 pb-2">
        {variant == "focusArea" ? "Focus Area" : "Type"}
      </h1>
      <ToggleGroup type="single" onValueChange={update} defaultValue={initial}>
        {DROPLET_FILTERS[index].options.map((option, index) => (
          <ToggleGroupItem key={index} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
