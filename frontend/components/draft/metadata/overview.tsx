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
    <section className="flex h-full w-full flex-col">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Overview
      </h2>
      <p className="mt-1 text-slate-500 dark:text-slate-300">
        Longer summary of droplet
      </p>
      <div className="mt-4 flex flex-1 flex-col">
        <DropletOverviewInput
          updateContent={(content: string) =>
            handleChange({ overview: content })
          }
          initialContent={initialContent}
        />
      </div>
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
