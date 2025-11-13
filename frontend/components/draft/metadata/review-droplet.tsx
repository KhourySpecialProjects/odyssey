"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ReviewDroplet({
  name,
  droplet,
}: {
  name: string;
  droplet: Droplet;
}) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [changes, setChanges] = useState(droplet.afterReview || "");
  const router = useRouter();

  const handleRequestReview = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: name, inReview: false, afterReview: changes },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      setIsPopupOpen(false);
      toast.success("Request for review submitted successfully");
      router.push("/review");
    } else {
      toast.error("Error requesting changes");
      setIsPopupOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-row space-x-2">
        <Button
          variant="outline"
          className="w-full rounded-full bg-red-400 dark:bg-red-600 px-6 py-2 text-black dark:text-white hover:bg-red-500 dark:hover:bg-red-800 text-center whitespace-nowrap"
          onClick={() => setIsPopupOpen(true)}
        >
          Request Changes
        </Button>
      </div>

      {isPopupOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-slate-900">
            <p className="pb-2">
              Enter what changes you want for this droplet:
            </p>
            <Textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="Enter changes here..."
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
                onClick={handleRequestReview}
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
