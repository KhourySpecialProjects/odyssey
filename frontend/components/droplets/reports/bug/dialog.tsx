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
          className="group h-6 bg-red-300 text-black hover:bg-red-400 dark:bg-red-300 dark:hover:bg-red-400"
          before={<Bug />}
        >
          <span className="hidden sm:inline-block">Report Bug</span>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 transform rounded bg-black px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
            Report Bug
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Bug</DialogTitle>
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
