"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Loader2, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deepDeleteDroplet } from "@/lib/requests/droplet";

export function DeleteDropletButton({ dropletId }: { dropletId: number }) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const inFlight = useRef(false);

  const deleteDroplet = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsDeleting(true);
    try {
      const response = await deepDeleteDroplet(dropletId);
      if (response.ok && !response.error) {
        router.replace(`/my-content`);
      }
    } catch (error) {
      console.error("Failed to delete droplet", error);
    } finally {
      inFlight.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Droplet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Droplet</DialogTitle>

          <DialogDescription
            className="my-4 flex flex-col items-center justify-center text-lg text-black"
            asChild
          >
            <div>
              <p>Are you sure you want to delete this Droplet?</p>
              <p>
                This action <span className="font-extrabold">cannot</span> be
                undone.
              </p>
              <p>
                This will also delete all lessons associated with this droplet.
              </p>
            </div>
          </DialogDescription>
          <div className="flex flex-row items-center justify-center space-x-4">
            <DialogClose asChild>
              <Button
                before={<ArrowLeftIcon />}
                variant="outline"
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={deleteDroplet}
              variant="destructive"
              disabled={isDeleting}
              aria-busy={isDeleting}
              after={
                isDeleting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2Icon />
                )
              }
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
