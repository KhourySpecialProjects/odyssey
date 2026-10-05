"use client";

import { useEffect, useRef } from "react";
import { recordMissingCompletion } from "@/lib/requests/enrollment";

/**
 * Fills in a legacy enrollment's missing isComplete/completionDate once the
 * page has loaded. Pages used to write this during render, where
 * revalidateTag throws; they now render this only when
 * needsCompletionBackfill() says the record needs it. Renders nothing.
 */
export function CompletionBackfill({ enrollmentId }: { enrollmentId: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    recordMissingCompletion(enrollmentId).catch((error) =>
      console.error("Failed to record droplet completion:", error),
    );
  }, [enrollmentId]);

  return null;
}
