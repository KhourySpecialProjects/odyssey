
"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updateDroplet } from "@/lib/requests/droplet";
import { useRouter } from "next/navigation";

type ClickableBadgesProps = {
  focusArea: string;
  type: string;
  dropletId: number;
};

const focusAreaOptions = ["Personal", "Professional", "Academic"];
const typeOptions = ["Skill", "Knowledge"];

export function ClickableBadges({ 
  focusArea, 
  type, 
  dropletId
}: ClickableBadgesProps) {
  const [activePopup, setActivePopup] = useState<"focusArea" | "type" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localFocusArea, setLocalFocusArea] = useState(focusArea);
  const [localType, setLocalType] = useState(type);
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
          [variant]: value.toLowerCase()
        });

        if (result.ok) {
          toast.success(`${variant === "focusArea" ? "Focus area" : "Type"} updated successfully`);
          router.refresh();
        } else {
          throw new Error(result.error || "Update failed");
        }
      } catch (error) {
        console.error(`Error updating ${variant}:`, error);
        toast.error(`Failed to update ${variant === "focusArea" ? "focus area" : "type"}`);
        // Revert optimistic update on error
        if (variant === "focusArea") {
          setLocalFocusArea(focusArea);
        } else {
          setLocalType(type);
        }
      }
    });
  };

  return (
    <>
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
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setActivePopup(null)}
            />
            
            {/* Popup */}
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
          onClick={() => setActivePopup("type")}
          disabled={isPending}
        >
          <Badge variant="outline" className="bg-gray-200 dark:bg-black">
            {uppercaseFirstChar(localType)}
          </Badge>
        </button>

        {activePopup === "type" && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setActivePopup(null)}
            />
            
            {/* Popup */}
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
    </>
  );
}