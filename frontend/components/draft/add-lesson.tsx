"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { PlusIcon, CornerDownLeftIcon, LoaderIcon } from "lucide-react";
import { Droplet, Lesson } from "@/types";
import { useRouter } from "next/navigation";
import { addLesson } from "@/lib/requests/lesson";

export function AddLesson({
  droplet,
  onAddLesson,
}: {
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  onAddLesson: (newLesson: Lesson) => void;
}) {
  const [isHidden, setIsHidden] = useState(true);
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
        notes: [],
        orderIndex: response.data.orderIndex
      };

      onAddLesson(newLesson);
      setIsHidden(true);
      router.push(`/draft/d/${droplet.slug}/${newLesson.slug}`);
    }
  }

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <p className="p-2 text-lg leading-7 font-bold">Lessons</p>
        <div className="cursor-pointer p-2">
          <PlusIcon role="button" onClick={handleClick} />
        </div>
      </div>

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
                className="border-0 bg-transparent ring-0 outline-none focus:ring-0 focus:outline-none"
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
