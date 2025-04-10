"use client";

import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletOverviewInput } from "@/components/ui/tiptap/droplet-overview-input";

export function Overview({
  dropletId,
  initialContent,
}: {
  dropletId: number;
  initialContent: string;
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);

  return (
    <section className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Overview
      </h2>
      <p className="text-slate-500 dark:text-slate-300">
        Longer summary of droplet
      </p>
      <DropletOverviewInput
        updateContent={(content: string) => handleChange({ overview: content })}
        initialContent={initialContent}
      />
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </section>
  );
}
