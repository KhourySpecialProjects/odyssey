"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Loader2, Trash2Icon } from "lucide-react";
import { IconTrash } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteLessonButton({
  deleteLesson,
  dropletSlug,
}: {
  deleteLesson: () => void | Promise<void>;
  dropletSlug: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const inFlight = useRef(false);

  const handleDelete = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsDeleting(true);
    try {
      await deleteLesson();
      router.push(`/draft/d/${dropletSlug}`);
    } catch (error) {
      console.error("Failed to delete lesson", error);
    } finally {
      inFlight.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                className="flex items-center justify-center rounded-md p-2 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                aria-label="Delete lesson"
              >
                <IconTrash className="h-5 w-5" stroke={1.8} />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Delete lesson</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className={isDeleting ? "opacity-50" : ""}>
        <DialogHeader>
          <DialogTitle>Delete Lesson</DialogTitle>

          <DialogDescription
            className="my-4 flex flex-col items-center justify-center text-lg text-black"
            asChild
          >
            <div>
              <p>Are you sure you want to delete this lesson? </p>
              <p>
                {" "}
                This action <span className="font-extrabold">cannot</span> be
                undone.
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
              onClick={handleDelete}
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
