"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

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

  const handleCancel = () => {
    setIsPopupOpen(false);
  };

  const modalContent = isPopupOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Request Changes
        </h3>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          Enter what changes you want for this droplet:
        </p>
        <Textarea
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          placeholder="Enter changes here..."
          className="mb-4 w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          rows={5}
        />
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
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
      <Button
        variant="outline"
        className="w-full rounded-full bg-red-400 px-6 py-2 text-center whitespace-nowrap text-black hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-800"
        onClick={() => setIsPopupOpen(true)}
      >
        Request Changes
      </Button>

      {typeof document !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}