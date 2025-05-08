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
    <section className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Description
      </h2>
      <p className="text-slate-500 dark:text-slate-300">
        Short summary of droplet
      </p>
      <DropletDescriptionInput
        updateContent={(content: string) =>
          handleChange({ description: content })
        }
        initialContent={initialContent}
      />
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </section>
  );
}
