import { useState, useCallback, useRef } from "react";
import { Lesson, Droplet } from "@/types";
import { updateDroplet } from "@/lib/actions";

interface QueueItem {
  lessonIds: { id: number }[];
  timestamp: number;
}

export function useLessonOrder(
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">,
) {
  const [lessons, setLessons] = useState<Lesson[]>(droplet.lessons || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const orderQueue = useRef<QueueItem[]>([]);
  const latestOrderTimestamp = useRef<number>(Date.now());

  // Process the queue of lesson order updates
  const processQueue = useCallback(async () => {
    if (isProcessing || orderQueue.current.length === 0) return;

    setIsProcessing(true);

    try {
      // Get the most recent order from the queue
      const latestOrder = orderQueue.current.reduce((latest, current) => {
        return current.timestamp > latest.timestamp ? current : latest;
      });

      // Update the order in the backend
      const result = await updateDroplet(
        droplet.id,
        {
          lessons: latestOrder.lessonIds,
        },
        { revalidate: true },
      );

      if (!result.ok) {
        console.error("Error updating lesson order:", result.error);
        // Optionally revert to the last known good state
        setLessons(droplet.lessons || []);
      }

      // Clear all queued updates that are older than the one we just processed
      orderQueue.current = orderQueue.current.filter(
        (item) => item.timestamp > latestOrder.timestamp,
      );
    } finally {
      setIsProcessing(false);

      // If there are still items in the queue, process them
      if (orderQueue.current.length > 0) {
        processQueue();
      }
    }
  }, [droplet.id, isProcessing]);

  // Handle lesson reordering
  const handleLessonReorder = useCallback(
    (newLessons: Lesson[]) => {
      // Update local state immediately
      setLessons(newLessons);

      // Create new order item
      const orderItem: QueueItem = {
        lessonIds: newLessons.map((lesson) => ({ id: lesson.id })),
        timestamp: Date.now(),
      };

      // Update latest timestamp
      latestOrderTimestamp.current = orderItem.timestamp;

      // Add to queue
      orderQueue.current.push(orderItem);

      // Trigger queue processing
      processQueue();
    },
    [processQueue],
  );

  // Get the current lesson order
  const getCurrentOrder = useCallback(() => {
    return lessons;
  }, [lessons]);

  // Check if there are pending updates
  const hasPendingUpdates = useCallback(() => {
    return orderQueue.current.length > 0;
  }, []);

  return {
    lessons,
    handleLessonReorder,
    getCurrentOrder,
    hasPendingUpdates,
    isProcessing,
  };
}
