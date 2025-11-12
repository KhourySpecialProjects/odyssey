"use client";
import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

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
      window.location.reload();
    } else {
      toast.error("Error submitting droplet for review");
      setIsReviewPopupOpen(false);
    }
  };

  const modalContent = isReviewPopupOpen ? (
    <div className="bg-opacity-50 fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Are you sure you want to submit this droplet for review?
        </h3>
        <p className="mb-2">
          Once this droplet is reviewed by a Content Editor, it will either be
          published or sent back with change requests.
        </p>
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
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsReviewPopupOpen(true)}
        className="w-full rounded-full bg-green-400 px-6 py-2 text-center whitespace-nowrap text-black hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-800"
      >
        {droplet.afterReview ? "Re-Request Review" : "Request Review"}
      </button>

      {typeof document !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
