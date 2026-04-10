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
import { LoaderIcon } from "lucide-react";
import { useState } from "react";
import { resolveEmailsToUserIds } from "@/lib/requests/authorized-user";

interface BulkAddUsersDialogProps {
  label: string;
  existingIds: number[];
  onAddUsers: (ids: number[]) => void;
}

export function BulkAddUsersDialog({
  label,
  existingIds,
  onAddUsers,
}: BulkAddUsersDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseEmails = (input: string): string[] => {
    return input
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@"));
  };

  const emailCount = parseEmails(emailInput).length;

  const handleDone = async () => {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const resolvedIds = await resolveEmailsToUserIds(emails);
      const newIds = resolvedIds.filter((id) => !existingIds.includes(id));

      if (newIds.length === 0) {
        setError("All users are already added.");
        setIsLoading(false);
        return;
      }

      onAddUsers(newIds);
      setEmailInput("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to resolve emails:", err);
      setError("Failed to resolve some email addresses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Add {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-500">
              Paste email addresses separated by commas, spaces, or new lines.
              Users that don&apos;t exist yet will be created automatically.
            </label>
            <Textarea
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError(null);
              }}
              className="min-h-[200px]"
              placeholder="john@example.com, jane@example.com"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDone}
              disabled={emailCount === 0 || isLoading}
              className="bg-[#287697] text-white hover:bg-[#1f6080]"
            >
              {isLoading ? (
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add {emailCount} {label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
