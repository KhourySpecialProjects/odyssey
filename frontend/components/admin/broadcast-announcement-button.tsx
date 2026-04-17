"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { createSystemBroadcast } from "@/lib/requests/feed";

const MAX_LEN = 1000;

export function BroadcastAnnouncementButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Content cannot be empty");
      return;
    }
    if (trimmed.length > MAX_LEN) {
      toast.error(`Content is too long (max ${MAX_LEN} characters)`);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createSystemBroadcast(trimmed);
      if (result.success) {
        toast.success("Announcement posted");
        setContent("");
        setOpen(false);
      } else {
        toast.error(result.error || "Could not post announcement");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Post Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post an announcement</DialogTitle>
          <DialogDescription>
            Everyone on Odyssey will see this in their feed. To remove it later,
            use the Strapi admin.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to tell everyone?"
          rows={5}
          maxLength={MAX_LEN}
          disabled={isSubmitting}
          className="resize-none"
        />
        <p className="text-right text-xs text-slate-500 dark:text-slate-400">
          {content.trim().length} / {MAX_LEN}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
