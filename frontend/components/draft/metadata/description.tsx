"use client";

import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletDescriptionInput } from "@/components/ui/tiptap/droplet-description-input";

export function Description({
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
        Description
      </h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Short summary of droplet
      </p>
      <div className="mt-4 flex flex-1 flex-col">
        <DropletDescriptionInput
          updateContent={(content: string) =>
            handleChange({ description: content })
          }
          initialContent={initialContent}
        />
      </div>
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
