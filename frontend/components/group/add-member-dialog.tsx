"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface AddMemberDialogProps {
  onAddMembers: (emails: string[]) => void;
}

export function AddMemberDialog({ onAddMembers }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const parseEmails = (input: string): string[] => {
    return input
      .split(/[\s,]+/)
      .map(email => email.trim())
      .filter(email => email.includes("@"));
  };

  const handleDone = () => {
    const emails = parseEmails(emailInput);
    if (emails.length > 0) {
      onAddMembers(emails);
      setEmailInput("");
      setOpen(false);
    }
  };

  const emailCount = parseEmails(emailInput).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 min-h-[300px]">
          <div className="space-y-2">
            <label className="text-sm text-slate-500">
              Enter email addresses (separated by commas or spaces)
            </label>
            <Textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="min-h-[200px]"
              placeholder="john@example.com, jane@example.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDone} disabled={emailCount === 0}>
              Add {emailCount} Member{emailCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}