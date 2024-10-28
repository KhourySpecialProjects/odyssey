import { useState, useEffect } from "react";
import { addLesson } from "@/lib/actions";
import { Droplet, Lesson } from "@/types";

export function useLessons(droplet: Pick<Droplet, "id" | "lessons">) {
  const [lessons, setLessons] = useState<Lesson[]>(droplet.lessons || []);

  useEffect(() => {
    setLessons(droplet.lessons || []);
  }, [droplet.lessons]);

  const addNewLesson = async (lessonData: { name: string }) => {
    const response = await addLesson({ ...lessonData, dropletId: droplet.id });
    if (response.ok) {
      setLessons((prevLessons) => [...prevLessons, response.data]);
    } else {
      console.error("Failed to add lesson:", response.error);
    }
  };

  return { lessons, addNewLesson };
}
