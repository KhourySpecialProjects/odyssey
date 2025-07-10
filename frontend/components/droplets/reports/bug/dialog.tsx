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
          className="group h-12 bg-white p-2 text-slate-700 hover:bg-slate-300 md:p-4 dark:text-slate-700"
          before={<Bug />}
        >
          <span className="inline-block">Report Bug</span>
          <span className="text-md pointer-events-none absolute right-[15%] -translate-x-90 transform rounded bg-black px-2 py-1 whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 md:hidden">
            Report Bug
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="md:max-w-[425px]">
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
