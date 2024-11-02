"use client";

import { useState, useRef, useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { useLessons } from "./metadata/hooks/useLessons"; // Assuming this hook is created
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";
import { CornerDownLeftIcon, LoaderIcon } from "lucide-react";

export function AddLesson({
  droplet,
  execute,
}: {
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  execute: () => void;
}) {
  const [isHidden, setIsHidden] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addNewLesson } = useLessons(droplet);
  const [pending, setPending] = useState(false);

  const showInput = () => {
    setIsHidden(false);
    inputRef.current!.focus();
  };

  const handleClick = () => {
    setIsHidden(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
      setIsHidden(true);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    setPending(true);
    event.preventDefault();
    const lessonName = inputRef.current?.value.trim();
    if (lessonName) {
      const response = await addNewLesson({ name: lessonName });
      setIsHidden(true);
      inputRef.current!.value = "";
      console.log(response);
      execute();
      router.push(`/draft/d/${droplet.slug}/${response!.slug}`);
    }
    setPending(false);
  };

  return (
    <>
      <div className="w-full flex justify-between items-center">
        <p className="p-2 text-lg font-bold leading-7">Lessons</p>
        <div className="p-2 cursor-pointer">
          <PlusIcon onClick={handleClick} />
        </div>
      </div>

      <ul>
        {!isHidden ? (
          <li className="w-full rounded shadow mb-2 pr-2">
            <form
              onSubmit={handleSubmit}
              className="flex flex-row justify-between items-center"
              autoComplete="off"
            >
              <input
                ref={inputRef}
                type="text"
                className="border-0 bg-transparent outline-none focus:outline-none ring-0 focus:ring-0"
                placeholder="Lesson Name"
                name="name"
              />
              <input type="hidden" name="dropletId" value={droplet.id} />
              <button type="submit" className="hidden" />
              {pending ? (
                <LoaderIcon className={"animate-spin"} />
              ) : (
                <CornerDownLeftIcon />
              )}
            </form>
          </li>
        ) : null}
      </ul>
    </>
  );
}
