"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateDroplet } from "@/lib/requests/droplet";
import { useRouter } from "next/navigation";
import type { Tag } from "@/types";

type ClickableBadgesProps = {
  focusArea: string;
  type: string;
  dropletId: number;
  tags: Tag[];
  selectedTags: Tag[];
  availableTags: Tag[];
};

const focusAreaOptions = ["Personal", "Professional", "Academic"];
const typeOptions = ["Skill", "Knowledge"];

export function ClickableBadges({
  focusArea,
  type,
  dropletId,
  tags: initialTags,
  selectedTags: initialSelectedTags,
  availableTags,
}: ClickableBadgesProps) {
  const [activePopup, setActivePopup] = useState<
    "focusArea" | "type" | "addTag" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [localFocusArea, setLocalFocusArea] = useState(focusArea);
  const [localType, setLocalType] = useState(type);
  const [selectedTags, setSelectedTags] = useState(initialSelectedTags);
  const [hoveredTagId, setHoveredTagId] = useState<number | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const router = useRouter();

  const handleSelect = async (variant: "focusArea" | "type", value: string) => {
    setActivePopup(null);

    // Optimistic update
    if (variant === "focusArea") {
      setLocalFocusArea(value);
    } else {
      setLocalType(value);
    }

    // Call update function
    startTransition(async () => {
      try {
        const result = await updateDroplet(dropletId, {
          [variant]: value.toLowerCase(),
        });

        if (result.ok) {
          toast.success(
            `${variant === "focusArea" ? "Focus area" : "Type"} updated successfully`,
          );
          router.refresh();
        } else {
          throw new Error(result.error || "Update failed");
        }
      } catch (error) {
        console.error(`Error updating ${variant}:`, error);
        toast.error(
          `Failed to update ${variant === "focusArea" ? "focus area" : "type"}`,
        );
        // Revert optimistic update on error
        if (variant === "focusArea") {
          setLocalFocusArea(focusArea);
        } else {
          setLocalType(type);
        }
      }
    });
  };

  const handleRemoveTag = async (tagId: number) => {
    const updatedTags = selectedTags.filter((t) => t.id !== tagId);
    setSelectedTags(updatedTags);

    startTransition(async () => {
      try {
        const result = await updateDroplet(dropletId, {
          tagIds: updatedTags.map((t) => t.id),
        });

        if (result.ok) {
          toast.success("Tag removed successfully");
          router.refresh();
        } else {
          setSelectedTags(selectedTags);
          throw new Error(result.error || "Update failed");
        }
      } catch (error) {
        console.error("Error removing tag:", error);
        toast.error("Failed to remove tag");
        setSelectedTags(selectedTags);
      }
    });
  };

  const handleAddTag = async (tagId: number) => {
    const tagToAdd = availableTags.find((t) => t.id === tagId);
    if (!tagToAdd) return;

    const updatedTags = [...selectedTags, tagToAdd];
    setSelectedTags(updatedTags);
    setActivePopup(null);
    setTagSearchQuery("");

    startTransition(async () => {
      try {
        const result = await updateDroplet(dropletId, {
          tagIds: updatedTags.map((t) => t.id),
        });

        if (result.ok) {
          toast.success("Tag added successfully");
          router.refresh();
        } else {
          setSelectedTags(selectedTags);
          throw new Error(result.error || "Update failed");
        }
      } catch (error) {
        console.error("Error adding tag:", error);
        toast.error("Failed to add tag");
        setSelectedTags(selectedTags);
      }
    });
  };

  const unselectedTags = availableTags.filter(
    (tag) => !selectedTags.some((st) => st.id === tag.id),
  );

  const filteredTags = unselectedTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      <div className="relative">
        <button
          onClick={() => setActivePopup("focusArea")}
          disabled={isPending}
        >
          <Badge variant="outline" className="bg-gray-200 dark:bg-black">
            {uppercaseFirstChar(localFocusArea)}
          </Badge>
        </button>

        {activePopup === "focusArea" && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActivePopup(null)}
            />

            <div className="absolute z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Focus Area
                </h3>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                {focusAreaOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect("focusArea", option)}
                    className="w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setActivePopup("type")} disabled={isPending}>
          <Badge variant="outline" className="bg-gray-200 dark:bg-black">
            {uppercaseFirstChar(localType)}
          </Badge>
        </button>

        {activePopup === "type" && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActivePopup(null)}
            />

            <div className="absolute z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Type
                </h3>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                {typeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect("type", option)}
                    className="w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => handleRemoveTag(tag.id)}
          onMouseEnter={() => setHoveredTagId(tag.id)}
          onMouseLeave={() => setHoveredTagId(null)}
          disabled={isPending}
          className="relative"
        >
          <Badge variant="outline" className="relative">
            {tag.name}
            {hoveredTagId === tag.id && (
              <div className="absolute inset-0 rounded-md bg-red-500/30" />
            )}
          </Badge>
        </button>
      ))}

      <div className="relative">
        <button onClick={() => setActivePopup("addTag")} disabled={isPending}>
          <Badge
            variant="outline"
            className="border-dashed border-slate-400 bg-transparent dark:border-slate-500"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Tag
          </Badge>
        </button>

        {activePopup === "addTag" && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setActivePopup(null);
                setTagSearchQuery("");
              }}
            />

            <div className="absolute z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Add Tag
                </h3>
                <button
                  onClick={() => {
                    setActivePopup(null);
                    setTagSearchQuery("");
                  }}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag.id)}
                      className="w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {tag.name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                    {tagSearchQuery
                      ? "No tags found"
                      : "No more tags available"}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
