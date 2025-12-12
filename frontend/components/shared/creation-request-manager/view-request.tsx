"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Lightbulb, Sparkles } from "lucide-react";
import { CreationRequest } from "@/types";
import { approveCreationRequest, deleteCreationRequest } from "@/lib/actions";
import { toast } from "sonner";

type CreationRequestModalProps = {
  request: CreationRequest;
  isOpen: boolean;
  onClose: () => void;
};

export function CreationRequestModal({
  request,
  isOpen,
  onClose,
}: CreationRequestModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    if (!request.id || !request.user?.id) {
      toast.error("Invalid request data");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await approveCreationRequest(
        request.id.toString(),
        request.user.id,
      );

      if (result.ok) {
        toast.success(
          `${request.user.firstName} ${request.user.lastName} is now a Content Creator!`,
        );
        onClose();
      } else {
        toast.error(`Failed to approve request: ${result.error}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!request.id) {
      toast.error("Invalid request data");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await deleteCreationRequest(request.id.toString());

      if (result.ok) {
        toast.success("Request declined and removed");
        onClose();
      } else {
        toast.error(`Failed to decline request: ${result.error}`);
      }
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-black dark:text-white">
            {request.user?.firstName} {request.user?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Motivation Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-black dark:text-white" />

              <h3 className="text-lg font-semibold text-black dark:text-white">
                Why do you want to create a droplet?
              </h3>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {request.motivation}
              </p>
            </div>
          </div>

          {/* Droplet Ideas Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-black dark:text-white" />

              <h3 className="text-lg font-semibold text-black dark:text-white">
                Droplet Ideas
              </h3>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {request.dropletIdea}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            onClick={handleDecline}
            disabled={isProcessing}
            variant="outline"
            className="flex-1 bg-red-500 text-black hover:bg-red-600 dark:bg-red-700 dark:text-white dark:hover:bg-red-900"
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black" />
                Processing...
              </span>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Approve & Grant Creator Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
