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
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteLessonButton({
  deleteLesson,
  dropletSlug,
}: {
  deleteLesson: () => void;
  dropletSlug: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      deleteLesson();
      router.push(`/draft/d/${dropletSlug}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete Lesson
        </Button>
      </DialogTrigger>
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
              after={
                isDeleting ? (
                  <span className="animate-spin">⟳</span>
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
