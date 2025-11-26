"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Droplet, Lesson } from "@/types";
import { Copy } from "lucide-react";
import { useState } from "react";
import { duplicateLessonToDroplet } from "@/lib/requests/lesson";
import { toast } from "sonner";

interface AddExistingLessonProps {
  droplet: Pick<
    Droplet,
    | "id"
    | "name"
    | "slug"
    | "type"
    | "focusArea"
    | "learningObjectives"
    | "status"
    | "lessons"
  >; // Include all required Droplet fields
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
  currentLessonCount: number;
  onAddLesson: (newLesson: Lesson) => void;
}

export function AddExistingLesson({
  droplet,
  availableDroplets,
  currentLessonCount,
  onAddLesson,
}: AddExistingLessonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDropletId, setSelectedDropletId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedDroplet = availableDroplets.find(
    (d) => d.id.toString() === selectedDropletId,
  );

  const availableLessons =
    selectedDroplet?.lessons?.sort((a, b) => a.orderIndex - b.orderIndex) || [];

  const handleDuplicate = async () => {
    if (!selectedLessonId) {
      toast.error("Please select a lesson");
      return;
    }

    setIsLoading(true);
    try {
      const result = await duplicateLessonToDroplet(
        parseInt(selectedLessonId),
        droplet.id,
        currentLessonCount,
      );

      if (result.ok && result.data) {
        const attributes = result.data.attributes;
        const blocksVersion = attributes.blocksVersion || "v1";

        const newLesson: Lesson = {
          id: result.data.id,
          name: attributes.name,
          slug: attributes.slug,
          type: attributes.type,
          orderIndex: attributes.orderIndex,
          blocks: attributes.blocks || [],
          blocksV2: attributes.blocksV2 || null, // Add blocksV2
          blocksVersion: blocksVersion, // Add blocksVersion
          notes: attributes.notes || null,
          droplets: [
            {
              id: droplet.id,
              name: droplet.name,
              slug: droplet.slug,
              type: droplet.type,
              focusArea: droplet.focusArea,
              learningObjectives: droplet.learningObjectives,
              status: droplet.status,
            } as Droplet,
          ],
        };

        onAddLesson(newLesson);
        toast.success("Lesson duplicated successfully!");
        setIsOpen(false);
        setSelectedDropletId("");
        setSelectedLessonId("");
      } else {
        toast.error(result.error || "Failed to duplicate lesson");
      }
    } catch (error) {
      console.error("Error duplicating lesson:", error);
      toast.error("Failed to duplicate lesson");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between rounded-lg p-2 text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700"
        >
          <span className="text-left">Add Existing Lesson</span>
          <Copy className="h-4 w-4 shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Lesson from Another Droplet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Droplet</label>
            <Select
              value={selectedDropletId}
              onValueChange={(value) => {
                setSelectedDropletId(value);
                setSelectedLessonId(""); // Reset lesson selection
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a droplet..." />
              </SelectTrigger>
              <SelectContent>
                {availableDroplets
                  .filter((d) => d.id !== droplet.id) // Exclude current droplet
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDropletId && availableLessons.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Lesson</label>
              <Select
                value={selectedLessonId}
                onValueChange={setSelectedLessonId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lesson..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id.toString()}>
                      {lesson.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedDropletId && availableLessons.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No lessons available in this droplet
            </p>
          )}

          <Button
            onClick={handleDuplicate}
            disabled={!selectedLessonId || isLoading}
            className="w-full"
          >
            {isLoading ? "Duplicating..." : "Duplicate Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
