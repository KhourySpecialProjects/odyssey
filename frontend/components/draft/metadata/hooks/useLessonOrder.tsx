// useLessonOrder.tsx
import {useRef, useEffect } from "react";
import { updateDroplet } from "@/lib/actions";
import { useState, useCallback } from "react";
import { addLesson } from "@/lib/actions";
import { Droplet, Lesson } from "@/types";

interface QueueItem {
  lessonIds: { id: number }[];
  timestamp: number;
}

export function useLessonOrder(
    droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">,
) {
  const [lessons, setLessons] = useState(droplet.lessons || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const orderQueue = useRef<QueueItem[]>([]);
  const latestOrderTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    setLessons(droplet.lessons || []);
  }, [droplet.lessons]);

  const updateLessons = useCallback((newLessons: Lesson[]) => {
    setLessons(newLessons);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || orderQueue.current.length === 0) return;

    setIsProcessing(true);

    try {
      const latestOrder = orderQueue.current.reduce((latest, current) => {
        return current.timestamp > latest.timestamp ? current : latest;
      });

      const result = await updateDroplet(
          droplet.id,
          {
            lessons: latestOrder.lessonIds,
          },
          { revalidate: true },
      );

      if (!result.ok) {
        console.error("Error updating lesson order:", result.error);
        setLessons(droplet.lessons || []);
      }

      orderQueue.current = orderQueue.current.filter(
          (item) => item.timestamp > latestOrder.timestamp,
      );
    } finally {
      setIsProcessing(false);
      if (orderQueue.current.length > 0) {
        processQueue();
      }
    }
  }, [droplet.id, droplet.lessons, isProcessing]);

  const handleLessonReorder = useCallback(
      (newLessons: Lesson[]) => {
        setLessons(newLessons);

        const orderItem: QueueItem = {
          lessonIds: newLessons.map((lesson) => ({ id: lesson.id })),
          timestamp: Date.now(),
        };

        latestOrderTimestamp.current = orderItem.timestamp;
        orderQueue.current.push(orderItem);

        if (!isProcessing) {
          processQueue();
        }
      },
      [processQueue, isProcessing]
  );


  return {
    lessons,
    handleLessonReorder,
    updateLessons,
    isProcessing,
  };
}
