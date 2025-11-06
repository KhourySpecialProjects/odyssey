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

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const updateName = (htmlName: string) => {
    const cleanName = htmlName
      .replace(/<[^>]*>?/gm, "")
      .replace("&nbsp;", " ")
      .trim();

    setName(cleanName);

    // Generate slug from the cleaned name
    const newSlug = generateSlug(cleanName);

    // Update both name and slug
    handleChange({
      name: cleanName,
      slug: newSlug,
    });
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
