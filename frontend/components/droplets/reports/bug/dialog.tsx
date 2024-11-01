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
import { MessageSquareWarningIcon } from "lucide-react";
import { useState } from "react";
import { ReportBugForm } from "./form";

export function ReportBugDialog({ user }: { user?: User | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" before={<MessageSquareWarningIcon />}>
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
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
