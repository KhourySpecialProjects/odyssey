"use client";

import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { htmlToText } from "@/lib/utils";
import { DropletDescriptionInput } from "@/components/ui/tiptap/droplet-description-input";

export function Description({
  dropletId,
  initialContent,
}: {
  dropletId: number;
  initialContent: string;
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);

  const updateDescription = async (description: string) => {
    const descriptionText = htmlToText(description);
    handleChange({ description: descriptionText });
  };

  return (
    <div role="textbox-spot">
      <DropletDescriptionInput
        initialContent={initialContent}
        updateContent={updateDescription}
      />

      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}
