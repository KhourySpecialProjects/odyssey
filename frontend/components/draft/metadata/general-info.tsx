// components/draft/metadata/general-info.tsx
"use client";

import { useState } from "react";
import { Selection } from "@/components/draft/metadata/selection";
import { DropletTile } from "@/components/droplets/droplet-tile";
import type { Droplet, Tag } from "@/types";
import { Trash2 } from "lucide-react";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type GeneralInfoProps = {
  dropletId: number;
  tags: Tag[];
  selectedTags: Tag[];
  droplets: Pick<Droplet, "id" | "name" | "slug">[];
  prerequisites: Droplet[];
  postrequisites: Droplet[];
};

function RemovableDropletTile({
  droplet,
  onRemove,
}: {
  droplet: Droplet;
  onRemove: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <DropletTile droplet={droplet} />
      
      {isHovering && (
        <>
          {/* Gray overlay */}
          <div className="absolute inset-0 z-10 rounded-md bg-black/50 backdrop-blur-sm" />
          
          {/* Trash icon */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-red-500 p-4 text-white transition-all hover:bg-red-600 hover:scale-110"
            aria-label="Remove droplet"
          >
            <Trash2 className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}

export function GeneralInfo({
  dropletId,
  tags,
  selectedTags,
  droplets,
  prerequisites,
  postrequisites,
}: GeneralInfoProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemovePrerequisite = async (dropletToRemove: Droplet) => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    try {
      const updatedPrerequisites = prerequisites
        .filter((d) => d.id !== dropletToRemove.id)
        .map((d) => d.id);

      const result = await updateDroplet(dropletId, {
        prerequisiteIds: updatedPrerequisites,
      });

      if (result.ok) {
        toast.success("Prerequisite removed successfully");
        router.refresh();
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (error) {
      console.error("Error removing prerequisite:", error);
      toast.error("Failed to remove prerequisite");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemovePostrequisite = async (dropletToRemove: Droplet) => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    try {
      const updatedPostrequisites = postrequisites
        .filter((d) => d.id !== dropletToRemove.id)
        .map((d) => d.id);

      const result = await updateDroplet(dropletId, {
        postrequisiteIds: updatedPostrequisites,
      });

      if (result.ok) {
        toast.success("Postrequisite removed successfully");
        router.refresh();
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (error) {
      console.error("Error removing postrequisite:", error);
      toast.error("Failed to remove postrequisite");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        General Info
      </h1>
      <p className="mb-8 text-slate-500 dark:text-slate-300">
        Information that users will see when they view the droplet{" "}
      </p>
      <div className="flex w-full flex-col space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Prerequisite Droplets
          </h2>
          <Selection
            variant="prerequisite"
            dropletId={dropletId}
            items={droplets}
            selectedItems={prerequisites}
          />
          {prerequisites.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {prerequisites.map((prereq) => (
                <RemovableDropletTile
                  key={prereq.id}
                  droplet={prereq}
                  onRemove={() => handleRemovePrerequisite(prereq)}
                />
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Similar Droplets
          </h2>
          <Selection
            variant="postrequisite"
            dropletId={dropletId}
            items={droplets}
            selectedItems={postrequisites}
          />
          {postrequisites.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {postrequisites.map((postreq) => (
                <RemovableDropletTile
                  key={postreq.id}
                  droplet={postreq}
                  onRemove={() => handleRemovePostrequisite(postreq)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}