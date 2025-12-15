"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { PlusIcon, CornerDownLeftIcon, LoaderIcon, Import } from "lucide-react";
import { Droplet, Lesson } from "@/types";
import { useRouter } from "next/navigation";
import { addLesson } from "@/lib/requests/lesson";
import { ImportLessonModal } from "../ui/import-lesson-modal";
import { toast } from "sonner";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";

export function AddLesson({
  droplet,
  onAddLesson,
}: {
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  onAddLesson: (newLesson: Lesson) => void;
}) {
  const [isHidden, setIsHidden] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // Add this state
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLLIElement>(null);
  const router = useRouter();

  const handleClick = () => {
    setIsHidden(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
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
    const response = await addLesson({
      name: formData.get("name") as string,
      dropletId: parseInt(formData.get("dropletId") as string),
      orderIndex: droplet.lessons?.length || 0,
    });

    if (response && !response.error) {
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

  // Updated handleImportClick function
  function handleImportClick() {
    setIsImportModalOpen(true);
  }

  async function handleImport(markdown: string) {
    try {
      // Step 1: Parse the markdown
      const { title, blocks } = parseMarkdownToBlockNote(markdown);

      // Step 2: Create the lesson with parsed blocks
      const createResponse = await addLesson({
        name: title,
        dropletId: droplet.id,
        orderIndex: droplet.lessons?.length || 0,
        blocksV2: blocks,
        blocksVersion: "v2",
      });

      if (createResponse && !createResponse.error) {
        const newLesson: Lesson = {
          id: createResponse.data.id,
          name: createResponse.data.attributes.name,
          slug: createResponse.data.attributes.slug,
          type: createResponse.data.attributes.type || "general",
          blocks: [],
          blocksV2: blocks,
          blocksVersion: "v2",
          droplets: [
            {
              id: droplet.id,
              name: droplet.name,
              slug: droplet.slug,
              type: createResponse.data.attributes.type || "",
              focusArea: createResponse.data.attributes.focusArea || "",
              learningObjectives: [],
              isHidden: false,
              status: "draft",
            },
          ],
          notes: "",
          orderIndex: createResponse.data.orderIndex,
        };

        onAddLesson(newLesson);
        toast.success(
          `Lesson "${title}" imported successfully with ${blocks.length} blocks!`,
        );
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
        <p className="p-2 text-lg font-bold leading-7">Lessons</p>
        <div className="flex items-center gap-2">
          {" "}
          {/* Changed to flex container */}
          <div className="cursor-pointer p-2">
            <Import
              role="button"
              onClick={handleImportClick}
              className="transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            />
          </div>
          <div className="cursor-pointer p-2">
            <PlusIcon
              role="button"
              onClick={handleClick}
              className="transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportLessonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        dropletName={droplet.name}
      />

      <ul>
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
                className="border-0 bg-transparent outline-none ring-0 focus:outline-none focus:ring-0"
                placeholder="Lesson Name"
                name="name"
              />
              <input
                type="submit"
                name="dropletId"
                hidden
                readOnly
                value={droplet.id}
              />
              <InputIcon />
            </form>
          </li>
        ) : null}
      </ul>
    </>
  );
}

function InputIcon() {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="mr-2 animate-spin" />
      ) : (
        <CornerDownLeftIcon className="mr-2" />
      )}
    </>
  );
}
