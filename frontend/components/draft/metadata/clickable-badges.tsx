"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateDroplet, createNewTag } from "@/lib/requests/droplet";
import { useRouter } from "next/navigation";
import type { Tag } from "@/types";
import { Button } from "@/components/ui/button";

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
  availableTags: initialAvailableTags,
}: ClickableBadgesProps) {
  const [activePopup, setActivePopup] = useState<
    "focusArea" | "type" | "addTag" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [localFocusArea, setLocalFocusArea] = useState(focusArea);
  const [localType, setLocalType] = useState(type);
  const [selectedTags, setSelectedTags] = useState(initialSelectedTags);
  const [availableTags, setAvailableTags] = useState(initialAvailableTags);
  const [hoveredTagId, setHoveredTagId] = useState<number | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
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

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Please enter a tag name");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createNewTag(newTagName.trim());

        if (result.success && result.data) {
          const newTag = result.data;

          // Add to available tags
          setAvailableTags([...availableTags, newTag]);

          // Add to selected tags and update droplet
          const updatedTags = [...selectedTags, newTag];
          setSelectedTags(updatedTags);

          const updateResult = await updateDroplet(dropletId, {
            tagIds: updatedTags.map((t) => t.id),
          });

          if (updateResult.ok) {
            toast.success("Tag created and added successfully");
            setNewTagName("");
            setIsCreatingTag(false);
            setActivePopup(null);
            setTagSearchQuery("");
            router.refresh();
          } else {
            // Revert on update failure
            setAvailableTags(availableTags);
            setSelectedTags(selectedTags);
            toast.error("Failed to add tag to droplet");
          }
        } else {
          toast.error(result.error || `"${newTagName}" tag already exists`);
        }
      } catch (error) {
        console.error("Failed to create new tag:", error);
        toast.error("Failed to create tag");
        setAvailableTags(availableTags);
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
          <Badge variant="outline" className="bg-purple-200 dark:bg-purple-600">
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
          <Badge variant="outline" className="bg-blue-200 dark:bg-blue-900">
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
                setIsCreatingTag(false);
                setNewTagName("");
              }}
            />

            <div className="absolute z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isCreatingTag ? "Create New Tag" : "Add Tag"}
                </h3>
                <button
                  onClick={() => {
                    setActivePopup(null);
                    setTagSearchQuery("");
                    setIsCreatingTag(false);
                    setNewTagName("");
                  }}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isCreatingTag ? (
                <div className="space-y-3 p-4">
                  <input
                    type="text"
                    placeholder="Enter tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateAndAddTag();
                      }
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                    autoFocus
                    disabled={isPending}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateAndAddTag}
                      disabled={isPending || !newTagName.trim()}
                      className="flex-1"
                      size="sm"
                    >
                      Create & Add
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTagName("");
                      }}
                      disabled={isPending}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
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
                  <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                    <button
                      onClick={() => setIsCreatingTag(true)}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Tag
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
