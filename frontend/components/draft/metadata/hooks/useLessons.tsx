import { useState, useEffect } from "react";
import { Droplet, Lesson } from "@/types";
import { addLesson } from "@/lib/requests/lesson";

export function useLessons(droplet: Pick<Droplet, "id" | "lessons">) {
  const [lessons, setLessons] = useState<Lesson[]>(droplet.lessons || []);

  useEffect(() => {
    setLessons(droplet.lessons || []);
  }, [droplet.lessons]);

  const addNewLesson = async (lessonData: { name: string }) => {
    const response = await addLesson({
      ...lessonData,
      dropletId: droplet.id,
      orderIndex: lessons.length,
    });
    if (response.ok) {
      setLessons((prevLessons) => [...prevLessons, response.data]);
      return { slug: response.data.attributes.slug };
    } else {
      console.error("Failed to add lesson:", response.error);
    }
  };

  return { lessons, addNewLesson };
}
