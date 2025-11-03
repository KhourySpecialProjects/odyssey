"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function RequestReviewButton({ droplet }: { droplet: Droplet }) {
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);

  const handleRequestReview = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: droplet.name, inReview: true },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      setIsReviewPopupOpen(false);
      toast.success("Droplet submitted for review");
      // Optionally refresh the page or update state
      window.location.reload();
    } else {
      toast.error("Error submitting droplet for review");
      setIsReviewPopupOpen(false);
    }
  };

  return (
    <>
      <div className="my-3 flex flex-row items-center space-x-2">
        <Button
          variant="outline"
          className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
          onClick={() => setIsReviewPopupOpen(true)}
        >
          {droplet.afterReview ? "Re-Request Review" : "Request Review"}
        </Button>
        <div className="group relative">
          <CircleHelp className="cursor-pointer" />
          <div className="pointer-events-none absolute top-full mt-2 flex w-[20vw] -translate-x-[50%] transform flex-col items-center gap-2 rounded bg-white p-4 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-800 dark:text-white">
            Once this droplet is reviewed by a Content Editor, it will either
            be published or sent back with change requests.
          </div>
        </div>
      </div>

      {isReviewPopupOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Are you sure you want to submit this droplet for review?
            </h3>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsReviewPopupOpen(false)}
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