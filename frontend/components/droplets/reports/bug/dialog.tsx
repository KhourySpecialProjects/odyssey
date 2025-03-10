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
import { useState } from "react";
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
          className="bg-red-300 dark:bg-red-300 h-6 text-black"
          before={<Bug />}
        >
          Report Bug
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
