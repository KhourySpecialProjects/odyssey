"use client";

import { useState } from "react";
import { MultiSelect, MultiSelectItem } from "@/components/new/multi-select";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { uppercaseFirstChar } from "@/lib/utils";

export function Selection({
  dropletId,
  items,
  selectedItems,
  variant,
}: {
  dropletId: number;
  items: MultiSelectItem[];
  selectedItems: MultiSelectItem[];
  variant: "prerequisite" | "postrequisite" | "tag";
}) {
  const [selected, setSelected] = useState<MultiSelectItem[]>(selectedItems);
  const { error, handleChange } = useDropletUpdate(dropletId);

  const update = (selected: MultiSelectItem[]) => {
    setSelected(selected);
    const ids = selected.map((item) => item.id);
    switch (variant) {
      case "prerequisite":
        handleChange({ prerequisiteIds: ids });
        break;
      case "postrequisite":
        handleChange({ postrequisiteIds: ids });
        break;
      case "tag":
        handleChange({ tagIds: ids });
        break;
    }
  };

  return (
    <>
      <MultiSelect
        label={uppercaseFirstChar(variant) + "s"}
        items={items}
        selected={selected}
        setSelected={update}
        align="start"
        className="flex w-full flex-row items-center justify-around"
      />
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </>
  );
}
