"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@/types";
import { Bug } from "lucide-react";
import { ReportBugForm } from "./form";

export function ReportBugDialog({
  user,
  open,
  onOpenChange,
}: {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="bg-red-300 dark:bg-red-300 hover:bg-red-400 dark:hover:bg-red-400 h-6 text-black group"
          before={<Bug />}
        >
          <span className="hidden sm:inline-block">Submit Feedback</span>
          <span className="sm:hidden absolute left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black text-white text-xs rounded px-2 py-1 pointer-events-none">
            Submit Feedback
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Is something outdated? Did you notice a typo? Let us know!
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4">
          <ReportBugForm
            name={user?.name}
            email={user?.email}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
