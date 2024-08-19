"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { PlusIcon, CornerDownLeftIcon, LoaderIcon } from "lucide-react";
import { addLesson } from "@/lib/actions";
import { Droplet } from "@/types";
import { useRouter } from "next/navigation";

export function AddLesson({
  droplet,
}: {
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
}) {
  const [isHidden, setIsHidden] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLLIElement>(null);
  const router = useRouter();

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
    }, 0); // Ensures the input is focused after rendering
  };

  const handleClickOutside = (event: any) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setIsHidden(true); // Action to perform when clicking outside
    }
  };

  useEffect(() => {
    // Add event listener for clicks outside
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Cleanup event listener on unmount
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function add(formData: FormData) {
    const response = await addLesson({
      name: formData.get("name") as string,
      dropletId: parseInt(formData.get("dropletId") as string),
    });
    if (response && !response.error) {
      const slug = response.data.attributes.slug;
      setIsHidden(true);
      router.push("/draft/d/" + droplet.slug + "/" + slug);
    }
  }

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
          <li ref={ref} className="w-full rounded shadow mb-2">
            <form
              action={add}
              className="flex flex-row justify-between items-center"
              autoComplete="off"
            >
              <input
                ref={inputRef}
                type="text"
                className={
                  "border-0 bg-transparent outline-none focus:outline-none ring-0 focus:ring-0"
                }
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
