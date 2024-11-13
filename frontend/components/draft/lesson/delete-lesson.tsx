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
import { ArrowLeftIcon, Trash, Trash2Icon } from "lucide-react";

export function DeleteLessonButton({
  deleteLesson,
}: {
  deleteLesson: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Lesson</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Lesson</DialogTitle>

          <DialogDescription
            className="my-4 text-lg text-black flex flex-col items-center justify-center"
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
              <Button before={<ArrowLeftIcon />} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={deleteLesson}
              variant="destructive"
              after={<Trash2Icon />}
            >
              Delete
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
