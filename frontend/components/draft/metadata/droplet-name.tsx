"use client";

import { useState } from "react";
import { Label } from "../../ui/label";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletNameInput } from "@/components/ui/tiptap/droplet-name-input";

export function DropletName({
  startingName,
  dropletId,
}: {
  startingName: string;
  dropletId: number;
}) {
  const [name, setName] = useState(startingName);
  const { error, handleChange } = useDropletUpdate(dropletId);

  const updateName = (htmlName: string) => {
    const name = htmlName
      .replace(/<[^>]*>?/gm, "")
      .replace("&nbsp;", " ")
      .trim();
    setName(name);
    handleChange({ name: name });
  };

  return (
    <>
      <Label htmlFor="name" className="pb-4 font-bold" hidden>
        Droplet Name
      </Label>
      <DropletNameInput
        updateContent={updateName}
        initialContent={`<h1>${name}</h1>`}
      />

      {error && <div className="mt-2 text-red-500">{error}</div>}
    </>
  );
}
