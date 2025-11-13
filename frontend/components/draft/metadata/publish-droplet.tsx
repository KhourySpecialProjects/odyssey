"use client";
import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export function PublishDropletButton({ 
  droplet,
}: { 
  droplet: Droplet;
}) {
  const [isPublishPopupOpen, setIsPublishPopupOpen] = useState(false);
  const router = useRouter();
  
  const handlePublishDroplet = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: droplet.name, status: "published", inReview: false },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      setIsPublishPopupOpen(false);
      toast.success("Droplet published successfully!");
      router.push("/review");
    } else {
      toast.error("Error publishing droplet");
      setIsPublishPopupOpen(false);
    }
  };

  const modalContent = isPublishPopupOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900 mx-4">
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Are you sure you want to publish this droplet?
        </h3>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsPublishPopupOpen(false)}
            className="dark:border-slate-600 dark:text-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublishDroplet}
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
          onClick={() => setIsPublishPopupOpen(true)}
          className="w-full rounded-full bg-blue-400 dark:bg-blue-600 px-6 py-2 text-black dark:text-white hover:bg-blue-500 dark:hover:bg-blue-800 text-center whitespace-nowrap"
        >
          Publish Droplet
        </button>

        {typeof document !== 'undefined' && modalContent && createPortal(
          modalContent,
          document.body
        )}
      </>
    );

}