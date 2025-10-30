import { useRef, useEffect } from "react";
import { useState, useCallback } from "react";
import { Droplet } from "@/types";
import { updateDroplet } from "@/lib/requests/droplet";
import { updateLesson } from "@/lib/requests/lesson";

interface QueueItem {
  dropletLessons: { id: number; orderIndex: number }[];
  timestamp: number;
}

export function useLessonOrder(droplet: Pick<Droplet, "id" | "lessons">) {
  const [dropletLessons, setDropletLessons] = useState(droplet.lessons || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const orderQueue = useRef<QueueItem[]>([]);
  const latestOrderTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    setDropletLessons(droplet.lessons || []);
  }, [droplet.lessons]);

  const processQueue = useCallback(async () => {
    if (isProcessing || orderQueue.current.length === 0) return;
    setIsProcessing(true);

    try {
      const latestOrder = orderQueue.current.reduce((latest, current) => {
        return current.timestamp > latest.timestamp ? current : latest;
      });

      await Promise.all(
        latestOrder.dropletLessons.map(({ id, orderIndex }) =>
          updateLesson(id, { orderIndex }),
        ),
      );

      orderQueue.current = orderQueue.current.filter(
        (item) => item.timestamp > latestOrder.timestamp,
      );
    } finally {
      setIsProcessing(false);
      if (orderQueue.current.length > 0) processQueue();
    }
  }, [droplet.id, droplet.lessons, isProcessing]);

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
