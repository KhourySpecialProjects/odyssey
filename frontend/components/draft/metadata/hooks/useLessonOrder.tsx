// useLessonOrder.tsx
import { useRef, useEffect } from "react";
import { updateDroplet } from "@/lib/actions";
import { useState, useCallback } from "react";
import { addLesson } from "@/lib/actions";
import { Droplet, Lesson } from "@/types";

interface QueueItem {
  dropletLessons: { id: number; orderIndex: number }[];
  timestamp: number;
}

export function useLessonOrder(
  droplet: Pick<Droplet, "id" | "droplet_lessons">,
) {
  const [dropletLessons, setDropletLessons] = useState(
    droplet.droplet_lessons || [],
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const orderQueue = useRef<QueueItem[]>([]);
  const latestOrderTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    setDropletLessons(droplet.droplet_lessons || []);
  }, [droplet.droplet_lessons]);

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
          droplet_lessons: latestOrder.dropletLessons,
        },
        { revalidate: true },
      );

      if (!result.ok) {
        console.error("Error updating lesson order:", result.error);
        setDropletLessons(droplet.droplet_lessons || []);
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
  }, [droplet.id, droplet.droplet_lessons, isProcessing]);

  const handleLessonReorder = useCallback(
    (newOrder: typeof dropletLessons) => {
      setDropletLessons(newOrder);

      const orderItem: QueueItem = {
        dropletLessons: newOrder.map((dl, index) => ({
          id: dl.id,
          orderIndex: index,
        })),
        timestamp: Date.now(),
      };

      latestOrderTimestamp.current = orderItem.timestamp;
      orderQueue.current.push(orderItem);

      if (!isProcessing) {
        processQueue();
      }
    },
    [processQueue, isProcessing],
  );

  return {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons: setDropletLessons,
    isProcessing,
  };
}
