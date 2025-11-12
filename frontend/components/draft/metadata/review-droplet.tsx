"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDroplet, publishDraftToOriginal } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ReviewDroplet({
  name,
  droplet,
}: {
  name: string;
  droplet: Droplet;
}) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [changes, setChanges] = useState(droplet.afterReview || "");
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();
  console.log("Droplet in ReviewDroplet:", droplet);
  const handlePublishDroplet = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: name, status: "published", inReview: false },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      toast.success("Droplet published successfully!");
      router.push("/review");
    } else {
      toast.error("Error publishing droplet");
      setIsPopupOpen(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!droplet.originalDropletId) {
      toast.error("No original droplet linked");
      return;
    }

    setIsPublishing(true);

    try {
      const result = await publishDraftToOriginal(
        droplet.id,
        droplet.originalDropletId,
      );

      if (!result.ok) {
        throw new Error(result.error || "Failed to publish draft");
      }

      toast.success("Draft published successfully!");
      router.push(`/d/${result.slug}`);
    } catch (error) {
      console.error("Error publishing draft:", error);
      toast.error("Failed to publish draft. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

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
        {droplet.originalDropletId ? (
          // Show "Publish Draft" button with confirmation dialog
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
                disabled={isPublishing}
              >
                {isPublishing ? "Publishing..." : "Publish Draft"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish Draft Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace the published droplet with your draft
                  changes. The current published version will be permanently
                  overwritten, and this draft will be deleted. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPublishing}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handlePublishDraft}
                  disabled={isPublishing}
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          // Show regular "Publish Droplet" button
          <Button
            variant="outline"
            className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
            onClick={handlePublishDroplet}
          >
            Publish Droplet
          </Button>
        )}

        <Button
          variant="outline"
          className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
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
