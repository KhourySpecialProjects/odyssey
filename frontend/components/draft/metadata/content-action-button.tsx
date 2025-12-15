"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDroplet, publishDraftToOriginal } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

type ActionType =
  | "publish"
  | "requestReview"
  | "requestChanges"
  | "publishDraft";

type ColorConfig = {
  button: string;
  buttonHover: string;
  darkButton: string;
  darkButtonHover: string;
};

type ContentActionButtonProps = {
  droplet: Droplet;
  actionType: ActionType;
  buttonText: string;
};

const colorConfigs: Record<ActionType, ColorConfig> = {
  publish: {
    button: "bg-blue-400",
    buttonHover: "hover:bg-blue-500",
    darkButton: "dark:bg-blue-600",
    darkButtonHover: "dark:hover:bg-blue-800",
  },
  requestReview: {
    button: "bg-orange-400",
    buttonHover: "hover:bg-orange-500",
    darkButton: "dark:bg-orange-600",
    darkButtonHover: "dark:hover:bg-orange-800",
  },
  requestChanges: {
    button: "bg-red-400",
    buttonHover: "hover:bg-red-500",
    darkButton: "dark:bg-red-600",
    darkButtonHover: "dark:hover:bg-red-800",
  },
  publishDraft: {
    button: "bg-green-400",
    buttonHover: "hover:bg-green-500",
    darkButton: "dark:bg-green-600",
    darkButtonHover: "dark:hover:bg-green-800",
  },
};

export function ContentActionButton({
  droplet,
  actionType,
  buttonText,
}: ContentActionButtonProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userTxt, setUserTxt] = useState<string>("");
  const [changes, setChanges] = useState(droplet.afterReview || "");
  const router = useRouter();

  const colorConfig = colorConfigs[actionType];

  const handleAction = async () => {
    setIsLoading(true);
    let response;
    let successMessage = "";
    let errorMessage = "";
    let redirectPath: string | null = null;
    let shouldReload = false;
    const publishResult = await publishDraftToOriginal(
      droplet.id,
      droplet.originalDropletId || 0,
    );

    try {
      switch (actionType) {
        case "publishDraft":
          if (!droplet.originalDropletId) {
            toast.error("No original droplet linked");
            return;
          }

          if (!publishResult.ok) {
            throw new Error(publishResult.error || "Failed to publish draft");
          }

          toast.success("Changes published successfully!");
          router.push(`/d/${publishResult.slug}`);
          return;

        case "publish":
          response = await updateDroplet(
            droplet.id,
            { name: droplet.name, status: "published", inReview: false },
            { regenerateSlug: false },
          );
          successMessage = "Droplet published successfully!";
          errorMessage = "Error publishing droplet";
          redirectPath = "/explore";
          break;

        case "requestReview":
          response = await updateDroplet(
            droplet.id,
            { name: droplet.name, inReview: true },
            { regenerateSlug: false },
          );
          successMessage = "Droplet submitted for review";
          errorMessage = "Error submitting droplet for review";
          shouldReload = true;
          break;

        case "requestChanges":
          response = await updateDroplet(
            droplet.id,
            { name: droplet.name, inReview: false, afterReview: changes },
            { regenerateSlug: false },
          );
          successMessage = "Request for review submitted successfully";
          errorMessage = "Error requesting changes";
          redirectPath = "/review";
          break;
      }

      if (response && response.ok && !response.error) {
        setIsPopupOpen(false);
        setUserTxt("");
        toast.success(successMessage);

        if (shouldReload) {
          window.location.reload();
        } else if (redirectPath) {
          router.push(redirectPath);
        }
      } else if (response) {
        toast.error(errorMessage);
        setIsPopupOpen(false);
        setUserTxt("");
      }
    } catch (error) {
      console.error("Action failed:", error);
      toast.error(error instanceof Error ? error.message : "Action failed");
      setIsPopupOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (actionType === "publish") {
      if (userTxt === droplet.name) {
        handleAction();
      }
    } else {
      handleAction();
    }
  };

  const handleCancel = () => {
    setIsPopupOpen(false);
    setUserTxt("");
  };

  const isConfirmEnabled =
    actionType === "publish" ? userTxt === droplet.name : true;

  const getModalContent = () => {
    switch (actionType) {
      case "publishDraft":
        return {
          title: "Publish Draft Changes",
          content: (
            <>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                This will replace the published droplet with your draft changes.
              </p>
              <p className="mb-4 text-sm font-semibold text-red-600 dark:text-red-400">
                Warning: The current published version will be permanently
                overwritten. This action cannot be undone.
              </p>
            </>
          ),
        };

      case "publish":
        return {
          title: "Are you sure you want to publish this droplet?",
          content: (
            <>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                Type{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  "{droplet.name}"
                </span>{" "}
                to confirm
              </p>
              <input
                type="text"
                value={userTxt}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setUserTxt(e.target.value)
                }
                placeholder="Enter droplet name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                autoFocus
              />
            </>
          ),
        };

      case "requestReview":
        return {
          title: "Are you sure you want to submit this droplet for review?",
          content: (
            <div>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                Once this droplet is reviewed by a Content Editor, it will
                either be published or sent back with change requests.
              </p>
            </div>
          ),
        };

      case "requestChanges":
        return {
          title: "Request Changes",
          content: (
            <>
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
            </>
          ),
        };
    }
  };

  const { title, content } = getModalContent();

  const modalContent = isPopupOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {content}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="dark:border-slate-600 dark:text-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isConfirmEnabled || isLoading}
              className="bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600"
            >
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsPopupOpen(true)}
        disabled={isLoading}
        className={`w-full whitespace-nowrap rounded-full px-6 py-2 text-center text-black dark:text-white ${colorConfig.button} ${colorConfig.buttonHover} ${colorConfig.darkButton} ${colorConfig.darkButtonHover} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isLoading ? "Processing..." : buttonText}
      </button>

      {typeof document !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
