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
  existingMembers: { email: string }[];
}

export function AddMemberDialog({
  onAddMembers,
  existingMembers,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const parseEmails = (input: string): string[] => {
    return input
      .split(/[\s,]+/)
      .map((email) => email.trim())
      .filter((email) => email.includes("@"));
  };

  const emailCount = parseEmails(emailInput).length;
  const existingMemberEmails = existingMembers.map((m) =>
    m.email.toLowerCase(),
  );

  const duplicateEmails = parseEmails(emailInput).filter((email) =>
    existingMemberEmails.includes(email),
  );

  const handleDone = () => {
    const emails = parseEmails(emailInput).filter(
      (email) => !existingMemberEmails.includes(email),
    );

    if (emails.length > 0) {
      onAddMembers(emails);
      setEmailInput("");
      setOpen(false);
    }
  };

  // const emailCount = parseEmails(emailInput).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        {" "}
        {/* Increased width from max-w-md to max-w-xl */}
        <DialogHeader>
          <DialogTitle>Add Members to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 min-h-[400px]">
          <div className="space-y-2">
            <label className="text-sm text-slate-500">
              Enter email addresses (separated by commas or spaces)
            </label>
            <Textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="min-h-[300px]"
              placeholder="john@example.com, jane@example.com"
            />
            {duplicateEmails.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex justify-between items-center">
                <div>
                  <p className="text-sm text-red-700 mb-2">
                    The following email addresses are already part of the group.
                    Please remove them before proceeding:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {duplicateEmails.map((email) => (
                      <span
                        key={email}
                        className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-red-700 hover:bg-red-100"
                  onClick={() => {
                    // Remove duplicate emails from the input
                    const cleanedEmails = parseEmails(emailInput)
                      .filter((email) => !duplicateEmails.includes(email))
                      .join(", ");
                    setEmailInput(cleanedEmails);
                  }}
                >
                  Remove All Duplicates
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDone}
              disabled={emailCount === 0 || duplicateEmails.length > 0}
            >
              Add {emailCount - duplicateEmails.length} Member
              {emailCount - duplicateEmails.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
