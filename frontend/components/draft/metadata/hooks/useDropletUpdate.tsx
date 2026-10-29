"use client";

import { useState, useCallback, useEffect } from "react";
import { z } from "zod";
import { DropletSchema } from "@/lib/validations/droplet";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { updateDroplet } from "@/lib/requests/droplet";
import { REVIEW_FROZEN_ERROR, REVIEW_FROZEN_MESSAGE } from "@/lib/review-roles";

// Every Overview editor's change still waiting out its debounce, and every
// save under way, so leaving Edit mode can wait for them (ODY-806)
const waiting = new Set<{ flush: () => unknown }>();
const saving = new Set<Promise<void>>();

/**
 * Sends every change still waiting out its debounce now, and resolves once
 * every save under way has finished, whether or not it worked
 */
export async function settleDropletUpdates(): Promise<void> {
  waiting.forEach((debounced) => debounced.flush());
  await Promise.allSettled(Array.from(saving));
}

export function useDropletUpdate(dropletId: number) {
  const [error, setError] = useState("");
  const router = useRouter();

  const update = async (data: Partial<z.infer<typeof DropletSchema>>) => {
    const response = await updateDroplet(dropletId, data);
    if (!response.error && response.data) {
      setError("");
      if (data.name) {
        router.replace(`/draft/d/${response.data.attributes.slug}`);
      }
    } else {
      if (response.error === REVIEW_FROZEN_ERROR) {
        setError(REVIEW_FROZEN_MESSAGE);
      } else if (
        response.error ===
        "description must be at most 500 characters (description)"
      ) {
        setError("The description must be less than 500 characters");
      } else {
        setError(
          "A droplet with a similar title is in progress or already exists.",
        );
      }
    }
  };

  const save = (data: Partial<z.infer<typeof DropletSchema>>) => {
    const done = update(data);
    saving.add(done);
    void done.finally(() => saving.delete(done));
    return done;
  };

  const debounceUpdate = useCallback(debounce(save, 1000), []);

  // A change still waiting is sent when its editor closes
  useEffect(() => {
    waiting.add(debounceUpdate);
    return () => {
      waiting.delete(debounceUpdate);
      debounceUpdate.flush();
    };
  }, [debounceUpdate]);

  const handleChange = (data: Partial<z.infer<typeof DropletSchema>>) => {
    setError("");
    debounceUpdate(data);
  };

  return {
    error,
    handleChange,
  };
}
