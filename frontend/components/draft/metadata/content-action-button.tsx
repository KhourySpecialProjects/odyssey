"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDroplet, publishDraftToOriginal } from "@/lib/requests/droplet";
import {
  submitForReview,
  withdrawFromReview,
  sendFeedback,
  publishWithReview,
} from "@/lib/requests/reviews";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useId, useState } from "react";
import { toast } from "sonner";
import { reviewFailureMessage } from "@/lib/review-panel/failure-message";
import { createPortal } from "react-dom";
type ActionType =
  | "publish"
  | "requestReview"
  | "withdrawReview"
  | "sendFeedback"
  | "publishWithReview"
  | "publishDraft";

const SUMMARY_NOTE_MAX = 5000;
/** The publish action returns codes for denials; anything else is a message for the author. */
function publishErrorMessage(error: string | null | undefined): string {
  if (error === "forbidden") return "You can't publish this draft.";
  if (error === "unauthenticated") return "Please sign in again.";
  if (error === "in_review") {
    return "This draft is in review. Publish it from the review.";
  }
  return error || "Failed to publish draft";
}

const REVIEW_SUCCESS = {
  requestReview: "Droplet submitted for review",
  withdrawReview: "Withdrawn from review",
  sendFeedback: "Feedback sent",
  publishWithReview: "Droplet published successfully!",
};
const REVIEW_FAILURES = {
  requestReview: "Error submitting droplet for review",
  withdrawReview: "Error withdrawing from review",
  sendFeedback: "Error sending feedback",
  publishWithReview: "Error publishing droplet",
};

export type ContentActionButtonProps = {
  droplet: Droplet;
  actionType: ActionType;
  buttonText: string;
  /** Disables the button (aria-disabled) and shows this as its helper text */
  disabledReason?: string;
  /** Pre-fills the Send feedback note until the reviewer edits it there */
  initialNote?: string;
};

export function ContentActionButton({
  droplet,
  actionType,
  buttonText,
  disabledReason,
  initialNote,
}: ContentActionButtonProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userTxt, setUserTxt] = useState<string>("");
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const noteId = useId();
  const reasonId = useId();
  const router = useRouter();

  const handleAction = async () => {
    setIsLoading(true);
    let response;
    let successMessage = "";
    let errorMessage = "";
    let redirectPath: string | null = null;

    try {
      switch (actionType) {
        case "publishDraft": {
          if (!droplet.originalDropletId) {
            toast.error("No original droplet linked");
            return;
          }

          // Overwrites the live droplet and deletes this draft, so it must
          // only run for this action (never for review requests)
          const publishResult = await publishDraftToOriginal(
            droplet.id,
            droplet.originalDropletId,
          );
          if (!publishResult.ok) {
            throw new Error(publishErrorMessage(publishResult.error));
          }

          toast.success("Changes published successfully!");
          // /my-content is where the sidebar sends authors after publishing.
          router.push(
            publishResult.slug ? `/d/${publishResult.slug}` : "/my-content",
          );
          return;
        }

        case "publish":
          response = await updateDroplet(
            droplet.id,
            { name: droplet.name, status: "published" },
            { regenerateSlug: false },
          );
          successMessage = "Droplet published successfully!";
          errorMessage = "Error publishing droplet";
          redirectPath = "/explore";
          break;

        case "requestReview":
        case "withdrawReview":
        case "sendFeedback":
        case "publishWithReview": {
          const result =
            actionType === "requestReview"
              ? await submitForReview(droplet.id)
              : actionType === "withdrawReview"
                ? await withdrawFromReview(droplet.id)
                : actionType === "sendFeedback"
                  ? await sendFeedback(droplet.id, note.trim() || null)
                  : await publishWithReview(droplet.id);
          if (!result.ok) {
            throw new Error(
              reviewFailureMessage(result, REVIEW_FAILURES[actionType]),
            );
          }

          setIsPopupOpen(false);
          setNote("");
          toast.success(REVIEW_SUCCESS[actionType]);
          if (actionType === "publishWithReview") {
            const slug = "slug" in result.data ? result.data.slug : null;
            router.push(slug ? `/d/${slug}` : "/my-content");
          } else if (actionType === "sendFeedback") {
            router.push("/review");
          } else {
            window.location.reload();
          }
          return;
        }
      }

      if (response && response.ok && !response.error) {
        setIsPopupOpen(false);
        setUserTxt("");
        toast.success(successMessage);

        if (redirectPath) router.push(redirectPath);
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

  const needsName =
    actionType === "publish" || actionType === "publishWithReview";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (needsName) {
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

  const isConfirmEnabled = needsName ? userTxt === droplet.name : true;

  const nameInput = (
    <input
      type="text"
      value={userTxt}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        setUserTxt(e.target.value)
      }
      placeholder="Enter droplet name"
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
      autoFocus
    />
  );

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
              {nameInput}
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

      case "withdrawReview":
        return {
          title: "Withdraw from review?",
          content: (
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              The droplet leaves the review queue and you can edit it again.
              Submit it again when it&apos;s ready.
            </p>
          ),
        };

      case "sendFeedback":
        return {
          title: "Send feedback",
          content: (
            <>
              <label
                htmlFor={noteId}
                className="mb-2 block text-sm text-slate-600 dark:text-slate-400"
              >
                Your review goes back to the authors. Add an optional summary:
              </label>
              <Textarea
                id={noteId}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteTouched(true);
                }}
                maxLength={SUMMARY_NOTE_MAX}
                placeholder="Optional summary..."
                className="mb-4 w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                rows={5}
              />
            </>
          ),
        };

      case "publishWithReview":
        return {
          title: "Publish with your review?",
          content: (
            <>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                This publishes the droplet and closes your review. It needs a
                confirmed Overall score for every criterion.
              </p>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                Type{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  "{droplet.name}"
                </span>{" "}
                to confirm
              </p>
              {nameInput}
            </>
          ),
        };
    }
  };

  const { title, content } = getModalContent();

  const modalContent = isPopupOpen ? (
    <div className="bg-opacity-50 fixed inset-0 z-[9999] flex items-center justify-center bg-black">
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

  const buttonColorClasses =
    actionType === "publish" ||
    actionType === "publishDraft" ||
    actionType === "publishWithReview"
      ? "border-[#2D7597] bg-[#2D7597] text-white hover:bg-[#255e78]"
      : actionType === "requestReview"
        ? "border-[#2D7597] bg-[#2D7597] text-white hover:bg-[#255e78]"
        : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <>
      <button
        onClick={() => {
          if (disabledReason) return;
          if (!noteTouched && initialNote !== undefined) setNote(initialNote);
          setIsPopupOpen(true);
        }}
        aria-disabled={disabledReason ? true : undefined}
        aria-describedby={disabledReason ? reasonId : undefined}
        disabled={isLoading}
        className={`flex h-10 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium whitespace-nowrap shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors disabled:pointer-events-none disabled:opacity-50 ${buttonColorClasses} ${disabledReason ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {isLoading ? "Processing..." : buttonText}
      </button>
      {disabledReason && (
        <p id={reasonId} className="mt-1 text-xs text-slate-600">
          {disabledReason}
        </p>
      )}

      {typeof document !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
