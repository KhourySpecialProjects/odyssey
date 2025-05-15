"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/actions";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function RegenerateSlugButton({
  name,
  dropletId,
}: {
  name: string;
  dropletId: number;
}) {
  const router = useRouter();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState("");

  const handleRegenerateSlug = async () => {
    if (newSlugInput.trim() === "") {
      console.error("New slug cannot be empty");
      return;
    }
    const response = await updateDroplet(
      dropletId,
      { name: name, slug: newSlugInput.trim() },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      router.replace(`/draft/d/${response.data.attributes.slug}`);
      setIsPopupOpen(false);
    } else {
      toast.error("A droplet with that slug already exists");
      setIsPopupOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
        onClick={() => setIsPopupOpen(true)}
      >
        Change URL
      </Button>

      {isPopupOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Enter New URL Slug
            </h3>
            <input
              type="text"
              value={newSlugInput}
              onChange={(e) => setNewSlugInput(e.target.value)}
              placeholder="e.g., my-new-url-slug"
              className="mb-4 w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsPopupOpen(false)}
                className="dark:border-slate-600 dark:text-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerateSlug}
                className="bg-sky-600 text-white hover:bg-sky-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
