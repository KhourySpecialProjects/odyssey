"use client";
import { useState } from "react";
import { Label } from "../../ui/label";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletNameInput } from "@/components/ui/tiptap/droplet-name-input";
import { stripHtmlTags } from "@/lib/utils";
import { IconPencil } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DropletName({
  startingName,
  dropletId,
}: {
  startingName: string;
  dropletId: number;
}) {
  const [name, setName] = useState(startingName);
  const [isEditing, setIsEditing] = useState(false);
  const { error, handleChange } = useDropletUpdate(dropletId);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const updateName = (htmlName: string) => {
    const cleanName = htmlName
      .replace(/<[^>]*>?/gm, "")
      .replace("&nbsp;", " ")
      .trim();

    setName(cleanName);

    const newSlug = generateSlug(cleanName);

    handleChange({
      name: stripHtmlTags(cleanName),
      slug: newSlug,
    });
  };

  return (
    <>
      <Label htmlFor="name" className="pb-4 font-bold" hidden>
        Droplet Name
      </Label>

      {isEditing ? (
        <div className="w-full">
          <DropletNameInput
            updateContent={updateName}
            initialContent={`<h1>${name}</h1>`}
            onBlur={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="inline-flex items-center gap-3">
          <h1 className="text-[2.5rem] font-bold text-slate-900 dark:text-white">
            {name}
          </h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center text-[#344054] hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label="Edit title"
                >
                  <IconPencil className="h-5 w-5" stroke={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit title</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {error && <div className="mt-2 text-red-500">{error}</div>}
    </>
  );
}
