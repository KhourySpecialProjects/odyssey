"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  IconCornerDownLeft,
  IconUpload,
  IconBook2,
  IconLoader2,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { Droplet, Lesson } from "@/types";
import { useRouter } from "next/navigation";
import { addLesson } from "@/lib/requests/lesson";
import { ImportLessonModal } from "../ui/import-lesson-modal";
import { ImportFileModal } from "./import-file-modal";
import { toast } from "sonner";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AddLesson({
  droplet,
  onAddLesson,
  onAddLessons,
}: {
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons" | "difficulty">;
  onAddLesson: (newLesson: Lesson) => void;
  onAddLessons?: (newLessons: Lesson[]) => void;
}) {
  const [isHidden, setIsHidden] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFileImportModalOpen, setIsFileImportModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLLIElement>(null);
  const router = useRouter();

  const handleClick = () => {
    setIsHidden(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      ref.current &&
      event.target instanceof Node &&
      !ref.current.contains(event.target)
    ) {
      setIsHidden(true);
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

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 pl-4">
          <IconBook2 className="h-4 w-4 shrink-0" stroke={1.5} />
          <p className="text-base leading-none font-medium">Lessons</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                aria-label="Import lessons"
                className="flex cursor-pointer items-center gap-0.5 p-2"
              >
                <IconUpload
                  className="h-4 w-4 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  stroke={2.5}
                />
                <IconChevronDown className="h-3 w-3" stroke={2.5} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                Import from Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsFileImportModalOpen(true)}>
                Import from File (PDF/PPTX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="cursor-pointer p-1">
            <IconPlus
              role="button"
              aria-label="Add lesson"
              onClick={handleClick}
              className="h-4 w-4 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
              stroke={2.5}
            />
          </div>
        </div>
      </div>

      <ImportLessonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        dropletName={droplet.name}
      />

      <ImportFileModal
        isOpen={isFileImportModalOpen}
        onClose={() => setIsFileImportModalOpen(false)}
        droplet={droplet}
        onAddLessons={onAddLessons ?? (() => {})}
      />

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
