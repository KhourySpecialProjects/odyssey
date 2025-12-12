"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { CircleHelp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function RegenerateSlugButton({
  name,
  droplet,
}: {
  name: string;
  droplet: Droplet;
}) {
  const router = useRouter();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState("");

  const handleRegenerateSlug = async () => {
    if (newSlugInput.trim() === "") {
      console.error("New slug cannot be empty");
      return;
    }
    const response = await updateDroplet(
      droplet.id,
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

  const handleRequestReview = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: name, inReview: true },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      setIsReviewPopupOpen(false);
      toast.success("Droplet submitted for review");
    } else {
      toast.error("Error submitting droplet for review");
      setIsReviewPopupOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-row items-center space-x-2">
        <Button
          variant="outline"
          className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
          onClick={() => setIsPopupOpen(true)}
        >
          Change URL
        </Button>
        {!droplet.inReview && droplet.status === "draft" && (
          <div className="flex flex-row items-center space-x-2">
            <Button
              variant="outline"
              className="dark:bg-slate-800 dark:outline dark:outline-slate-500"
              onClick={() => setIsReviewPopupOpen(true)}
            >
              {droplet.afterReview ? "Re-Request Review" : "Request Review"}
            </Button>
            <div className="group relative">
              <CircleHelp className="cursor-pointer" />

              <div className="pointer-events-none absolute top-full mt-2 flex w-[20vw] -translate-x-[50%] transform flex-col items-center gap-2 rounded bg-white p-4 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Once this droplet is reviewed by a Content Editor, it will
                either be published or sent back with change requests.
              </div>
            </div>
          </div>
        )}
        {droplet.status === "draft" && droplet.inReview && (
          <div className="p-2">Droplet currently in review</div>
        )}
      </div>

      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
      {isReviewPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
