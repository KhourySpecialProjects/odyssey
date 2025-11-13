"use client";
import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export function PublishDropletButton({ droplet }: { droplet: Droplet }) {
  const [isPublishPopupOpen, setIsPublishPopupOpen] = useState(false);
  const [userTxt, setUserTxt] = useState<string>("");
  const router = useRouter();

  const handleType = (e: ChangeEvent<HTMLInputElement>) => {
    setUserTxt(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (userTxt === droplet.name) {
      handlePublishDroplet();
    }
  };

  const handlePublishDroplet = async () => {
    const response = await updateDroplet(
      droplet.id,
      { name: droplet.name, status: "published", inReview: false },
      { regenerateSlug: false },
    );
    if (response.ok && !response.error) {
      setIsPublishPopupOpen(false);
      setUserTxt(""); // Reset input
      toast.success("Droplet published successfully!");
      router.push("/review");
    } else {
      toast.error("Error publishing droplet");
      setIsPublishPopupOpen(false);
      setUserTxt(""); // Reset input
    }
  };

  const handleCancel = () => {
    setIsPublishPopupOpen(false);
    setUserTxt(""); // Reset input when canceling
  };

  const isConfirmEnabled = userTxt === droplet.name;

  const modalContent = isPublishPopupOpen ? (
    <div className="bg-opacity-50 fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Are you sure you want to publish this droplet?
        </h3>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          Type{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            "{droplet.name}"
          </span>{" "}
          to confirm
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={userTxt}
            onChange={handleType}
            placeholder="Enter droplet name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="dark:border-slate-600 dark:text-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isConfirmEnabled}
              className="bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600"
            >
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsPublishPopupOpen(true)}
        className="w-full rounded-full bg-blue-400 px-6 py-2 text-center whitespace-nowrap text-black hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-800"
      >
        Publish Droplet
      </button>

      {typeof document !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
