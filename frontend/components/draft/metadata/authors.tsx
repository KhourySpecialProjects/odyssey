"use client";

import { useState } from "react";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { UserMultiSelect } from "@/components/ui/user-multi-select";

export function Authors({
  dropletId,
  selectedIds: initialSelectedIds,
}: {
  dropletId: number;
  selectedIds: number[];
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);
  const [currentSelectedIds, setCurrentSelectedIds] =
    useState<number[]>(initialSelectedIds);

  const handleSelectionChange = (newSelectedIds: number[]) => {
    setCurrentSelectedIds(newSelectedIds);
    handleChange({ authorized_users: newSelectedIds });
  };

  return (
    <section className="w-full max-w-2xl">
      <h2 className="pb-4 text-2xl font-bold text-slate-900 dark:text-white">
        Author(s)
      </h2>
      <UserMultiSelect
        selectedIds={currentSelectedIds}
        onChange={handleSelectionChange}
      />
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
