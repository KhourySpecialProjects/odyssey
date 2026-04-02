"use client";

import { useState, useTransition } from "react";
import { uppercaseFirstChar, cn } from "@/lib/utils";

const TAG_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  technical: { bg: "bg-[#e2e9ff]", text: "text-[#58579c]" },
  skill: { bg: "bg-[#fae6f3]", text: "text-[#855169]" },
  knowledge: { bg: "bg-[#f9f7e6]", text: "text-[#7f6b55]" },
  professional: { bg: "bg-[#def2fd]", text: "text-[#284965]" },
  personal: { bg: "bg-[#f0fdf4]", text: "text-[#166534]" },
  databases: { bg: "bg-[#e0f2fe]", text: "text-[#0c4a6e]" },
  interviews: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  cloud: { bg: "bg-[#ede9fe]", text: "text-[#5b21b6]" },
  security: { bg: "bg-[#fce7f3]", text: "text-[#9d174d]" },
  networking: { bg: "bg-[#d1fae5]", text: "text-[#065f46]" },
  algorithms: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]" },
  web: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]" },
  ai: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  "machine learning": { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  devops: { bg: "bg-[#ccfbf1]", text: "text-[#134e4a]" },
  testing: { bg: "bg-[#fff7ed]", text: "text-[#9a3412]" },
  academic: { bg: "bg-[#e2e9ff]", text: "text-[#58579c]" },
};

const FALLBACK_COLORS = [
  { bg: "bg-[#fce4ec]", text: "text-[#880e4f]" },
  { bg: "bg-[#e8eaf6]", text: "text-[#283593]" },
  { bg: "bg-[#e0f7fa]", text: "text-[#00695c]" },
  { bg: "bg-[#fff3e0]", text: "text-[#e65100]" },
  { bg: "bg-[#f3e5f5]", text: "text-[#6a1b9a]" },
  { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]" },
  { bg: "bg-[#fce4ec]", text: "text-[#ad1457]" },
  { bg: "bg-[#e1f5fe]", text: "text-[#01579b]" },
];

function getTagColors(name: string) {
  const key = name.toLowerCase();
  if (TAG_TYPE_COLORS[key]) return TAG_TYPE_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
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
  selectedTags: Tag[];
  availableTags: Tag[];
};

const focusAreaOptions = ["Personal", "Professional", "Academic"];
const typeOptions = ["Skill", "Knowledge"];

export function ClickableBadges({
  focusArea,
  type,
  dropletId,
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
    <div className="flex flex-wrap gap-1.5 pb-2">
      <div className="relative">
        <button
          className="h-full"
          onClick={() => setActivePopup("focusArea")}
          disabled={isPending}
        >
          <span
            className={cn(
              "inline-flex items-center rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium opacity-90 hover:brightness-75",
              getTagColors(localFocusArea).bg,
              getTagColors(localFocusArea).text,
            )}
          >
            {uppercaseFirstChar(localFocusArea)}
          </span>
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
        <button
          className="h-full"
          onClick={() => setActivePopup("type")}
          disabled={isPending}
        >
          <span
            className={cn(
              "inline-flex items-center rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium opacity-90 hover:brightness-75",
              getTagColors(localType).bg,
              getTagColors(localType).text,
            )}
          >
            {uppercaseFirstChar(localType)}
          </span>
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
          disabled={isPending}
          className="h-full"
        >
          <span
            className={cn(
              "inline-flex items-center rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium opacity-90 hover:brightness-75",
              getTagColors(tag.name).bg,
              getTagColors(tag.name).text,
            )}
          >
            {tag.name}
          </span>
        </button>
      ))}

      <div className="relative h-full p-0">
        <button
          className="h-full"
          onClick={() => setActivePopup("addTag")}
          disabled={isPending}
        >
          <div className="flex h-full flex-row items-center gap-1 text-black dark:text-white">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <p className="text-[14px] leading-[18px] font-medium">Add Tag</p>
          </div>
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
