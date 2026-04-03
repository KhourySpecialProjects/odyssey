"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  IconCornerDownLeft,
  IconUpload,
  IconBook2,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";
import { Droplet, Lesson } from "@/types";
import { useRouter } from "next/navigation";
import { addLesson, duplicateLessonToDroplet } from "@/lib/requests/lesson";
import { ImportLessonModal } from "../ui/import-lesson-modal";
import { ImportFileModal } from "./import-file-modal";
import { toast } from "sonner";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AddLesson({
  droplet,
  onAddLesson,
  availableDroplets = [],
  currentLessonCount = 0,
  onAddLessons,
}: {
  droplet: Pick<
    Droplet,
    | "id"
    | "name"
    | "slug"
    | "lessons"
    | "difficulty"
    | "type"
    | "focusArea"
    | "learningObjectives"
    | "status"
  >;
  onAddLesson: (newLesson: Lesson) => void;
  availableDroplets?: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
  currentLessonCount?: number;
  onAddLessons?: (newLessons: Lesson[]) => void;
}) {
  const [isHidden, setIsHidden] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFileImportModalOpen, setIsFileImportModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isExistingOpen, setIsExistingOpen] = useState(false);
  const [selectedDropletId, setSelectedDropletId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const selectedDroplet = availableDroplets.find(
    (d) => d.id.toString() === selectedDropletId,
  );
  const availableLessons =
    selectedDroplet?.lessons?.sort((a, b) => a.orderIndex - b.orderIndex) || [];

  const handleClickOutside = (event: MouseEvent) => {
    if (
      ref.current &&
      event.target instanceof Node &&
      !ref.current.contains(event.target)
    ) {
      setIsHidden(true);
    }
    if (
      menuRef.current &&
      event.target instanceof Node &&
      !menuRef.current.contains(event.target)
    ) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function add(formData: FormData) {
    const name = formData.get("name") as string;
    if (name?.trim()) {
      const response = await addLesson({
        name,
        dropletId: droplet.id,
        orderIndex: droplet.lessons?.length || 0,
      });

      if (response?.data) {
        const newLesson: Lesson = {
          id: response.data.id,
          name: response.data.attributes.name,
          slug: response.data.attributes.slug,
          type: response.data.attributes.type || "general",
          blocks: [],
          droplets: [
            {
              id: droplet.id,
              name: droplet.name,
              slug: droplet.slug,
              type: response.data.attributes.type || "",
              focusArea: response.data.attributes.focusArea || "",
              difficulty: droplet.difficulty,
              learningObjectives: [],
              isHidden: false,
              status: "draft",
            },
          ],
          notes: "",
          orderIndex: response.data.orderIndex,
        };

        onAddLesson(newLesson);
        setIsHidden(true);
        router.push(`/draft/d/${droplet.slug}/${newLesson.slug}`);
      }
    }
  }

  async function handleImport(markdown: string) {
    try {
      const { title, blocks } = parseMarkdownToBlockNote(markdown);

      const createResponse = await addLesson({
        name: title,
        dropletId: droplet.id,
        orderIndex: droplet.lessons?.length || 0,
        blocksV2: blocks,
        blocksVersion: "v2",
      });

      if (createResponse?.data) {
        const newLesson: Lesson = {
          id: createResponse.data.id,
          name: createResponse.data.attributes.name,
          slug: createResponse.data.attributes.slug,
          type: createResponse.data.attributes.type || "general",
          blocks: [],
          droplets: [
            {
              id: droplet.id,
              name: droplet.name,
              slug: droplet.slug,
              type: createResponse.data.attributes.type || "",
              focusArea: createResponse.data.attributes.focusArea || "",
              difficulty: droplet.difficulty,
              learningObjectives: [],
              isHidden: false,
              status: "draft",
            },
          ],
          notes: "",
          orderIndex: createResponse.data.orderIndex,
        };

        onAddLesson(newLesson);
        setIsImportModalOpen(false);
        toast.success(`Lesson "${newLesson.name}" imported successfully`);
        router.push(`/draft/d/${droplet.slug}/${newLesson.slug}`);
      } else {
        toast.error(createResponse?.error || "Failed to create lesson");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import markdown. Please check the format.");
    }
  }

  async function handleDuplicate() {
    if (!selectedLessonId) {
      toast.error("Please select a lesson");
      return;
    }
    setIsLoadingExisting(true);
    try {
      const result = await duplicateLessonToDroplet(
        parseInt(selectedLessonId),
        droplet.id,
        currentLessonCount,
      );

      if (result.ok && result.data) {
        const attributes = result.data.attributes;
        const newLesson: Lesson = {
          id: result.data.id,
          name: attributes.name,
          slug: attributes.slug,
          type: attributes.type,
          orderIndex: attributes.orderIndex,
          blocks: attributes.blocks || [],
          blocksV2: attributes.blocksV2 || null,
          blocksVersion: attributes.blocksVersion || "v1",
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
        setIsExistingOpen(false);
        setSelectedDropletId("");
        setSelectedLessonId("");
      } else {
        toast.error(result.error || "Failed to duplicate lesson");
      }
    } catch (error) {
      console.error("Error duplicating lesson:", error);
      toast.error("Failed to duplicate lesson");
    } finally {
      setIsLoadingExisting(false);
    }
  }

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 pl-4">
          <IconBook2 className="h-4 w-4 shrink-0" stroke={1.5} />
          <p className="text-base leading-none font-medium">Lessons</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="cursor-pointer p-2">
            <IconUpload
              role="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-4 w-4 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
              stroke={2.5}
            />
          </div>
          <div className="relative" ref={menuRef}>
            <div className="cursor-pointer p-1">
              <IconPlus
                role="button"
                onClick={() => setShowMenu((v) => !v)}
                className="h-4 w-4 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                stroke={2.5}
              />
            </div>
            {showMenu && (
              <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-800">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setShowMenu(false);
                    setIsHidden(false);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                >
                  New Lesson
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setShowMenu(false);
                    setIsExistingOpen(true);
                  }}
                >
                  Add Existing Lesson
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setShowMenu(false);
                    setIsFileImportModalOpen(true);
                  }}
                >
                  Import from File (PDF/PPTX)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Markdown Import Modal */}
      <ImportLessonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        dropletName={droplet.name}
      />

      {/* File Import Modal (PDF/PPTX) */}
      <ImportFileModal
        isOpen={isFileImportModalOpen}
        onClose={() => setIsFileImportModalOpen(false)}
        droplet={droplet}
        onAddLessons={onAddLessons ?? (() => {})}
      />

      {/* Add Existing Lesson Dialog */}
      <Dialog open={isExistingOpen} onOpenChange={setIsExistingOpen}>
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
                  setSelectedLessonId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a droplet..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDroplets
                    .filter((d) => d.id !== droplet.id)
                    .sort((a, b) => a.name.localeCompare(b.name))
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
              disabled={!selectedLessonId || isLoadingExisting}
              className="w-full"
            >
              {isLoadingExisting ? "Duplicating..." : "Duplicate Lesson"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ul className={isHidden ? "hidden" : ""}>
        {!isHidden ? (
          <li ref={ref} className="mb-2 w-full rounded shadow">
            <form
              action={add}
              className="flex flex-row items-center justify-between"
              autoComplete="off"
              role="form"
            >
              <input
                ref={inputRef}
                type="text"
                name="name"
                required
                placeholder="Enter a lesson name"
                className="w-full rounded border-0 bg-transparent p-2 text-sm outline-none placeholder:text-sm placeholder:text-gray-400"
              />
              <SubmitButton />
            </form>
          </li>
        ) : null}
      </ul>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-label="Submit"
      disabled={pending}
      className="flex items-center p-2"
    >
      {pending ? (
        <IconLoader2 className="mr-2 animate-spin" />
      ) : (
        <IconCornerDownLeft className="mr-2" />
      )}
    </button>
  );
}
