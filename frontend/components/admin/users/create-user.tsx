"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAuthorizedUserWithState } from "@/lib/actions";
import { IconPlus, IconUpload } from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateUser() {
  const [open, setOpen] = useState(false);
  const [singleEmail, setSingleEmail] = useState("");
  const [batchEmails, setBatchEmails] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleAddSingleUser = async () => {
    if (!singleEmail.trim()) return;
    setSingleLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", singleEmail.trim());
      formData.set("isEnabled", "on");
      const result = await createAuthorizedUserWithState(null, formData);
      if (result?.ok) {
        toast.success(`User ${singleEmail} added successfully`);
        setSingleEmail("");
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to add user");
      }
    } catch {
      toast.error("Failed to add user");
    } finally {
      setSingleLoading(false);
    }
  };

  const handleAddBatchUsers = async () => {
    const emails = batchEmails
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    setBatchLoading(true);
    let success = 0;
    let failed = 0;
    for (const email of emails) {
      try {
        const formData = new FormData();
        formData.set("email", email);
        formData.set("isEnabled", "on");
        const result = await createAuthorizedUserWithState(null, formData);
        if (result?.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    if (success > 0) {
      toast.success(`Added ${success} user${success > 1 ? "s" : ""}`);
      router.refresh();
    }
    if (failed > 0) {
      toast.error(
        `Failed to add ${failed} user${failed > 1 ? "s" : ""} (may already exist)`,
      );
    }
    setBatchEmails("");
    setBatchLoading(false);
  };

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // Parse CSV — extract emails from all rows/columns
        const emails = text
          .split(/[,\n\r]+/)
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter((s) => s.includes("@"));
        setBatchEmails(emails.join("\n"));
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#2D7597] text-white hover:bg-[#255e78]">
          <IconPlus className="mr-1 h-5 w-5" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1260px] overflow-hidden !rounded-[20px] border-0 p-0">
        <DialogTitle className="sr-only">Create User</DialogTitle>
        <div className="px-14 py-10">
          {/* Title */}
          <h2 className="text-[40px] font-semibold text-black">Create User</h2>
          <hr className="mt-4 mb-8 border-[#eaecf0]" />

          {/* Add User section */}
          <div className="mb-8">
            <h3 className="text-[26px] font-medium text-black">Add User</h3>
            <p className="mt-1 text-[20px] text-[#475569]">
              Invite a new user by entering their email address.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="Enter email address"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSingleUser();
                  }
                }}
                className="h-[44px] flex-1 rounded-[30px] border-2 border-[#efeff0] bg-[#fcfcfd] px-5 text-[16px] text-slate-900 outline-none placeholder:text-[#667085] focus:border-[#2D7597]"
              />
              <button
                onClick={handleAddSingleUser}
                disabled={singleLoading || !singleEmail.trim()}
                className="flex h-[44px] w-[121px] items-center justify-center gap-[6px] rounded-[8px] border border-[#2D7597] bg-[#2D7597] text-[16px] font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78] disabled:opacity-50"
              >
                <IconPlus className="h-5 w-5" />
                {singleLoading ? "Adding..." : "Add User"}
              </button>
            </div>
          </div>

          {/* Batch Add Users section */}
          <div>
            <h3 className="text-[26px] font-medium text-black">
              Batch Add Users
            </h3>
            <p className="mt-1 text-[20px] text-[#475569]">
              Enter multiple email addresses or upload a CSV file.
            </p>

            {/* Textarea */}
            <textarea
              value={batchEmails}
              onChange={(e) => setBatchEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas or new lines."
              rows={4}
              className="mt-4 w-full rounded-[30px] border-2 border-[#efeff0] bg-[#fcfcfd] px-5 py-4 text-[16px] text-slate-900 outline-none placeholder:text-[#667085] focus:border-[#2D7597]"
            />

            {/* Drag & Drop area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex h-[56px] cursor-pointer items-center gap-[10px] rounded-[30px] border-[3px] border-dashed border-[#efeff0] bg-[#fcfcfd] px-5 transition-colors hover:border-[#2D7597]"
            >
              <IconUpload className="h-5 w-5 text-[#667085]" />
              <p className="text-[16px] text-[#667085]">
                Drag and Drop files here or{" "}
                <span className="text-[#2D7597] underline">choose file</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            {/* Add Users button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAddBatchUsers}
                disabled={batchLoading || !batchEmails.trim()}
                className="flex h-[44px] w-[127px] items-center justify-center gap-[6px] rounded-[8px] border border-[#2D7597] bg-[#2D7597] text-[16px] font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78] disabled:opacity-50"
              >
                <IconPlus className="h-5 w-5" />
                {batchLoading ? "Adding..." : "Add Users"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
