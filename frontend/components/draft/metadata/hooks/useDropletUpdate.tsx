"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { DropletSchema } from "@/lib/validations/droplet";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { updateDroplet } from "@/lib/requests/droplet";

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
      if (response.error === "description must be at most 500 characters (description)") {
        setError(
        "The description must be less than 500 characters",
      );
      } else {
         setError(
        "A droplet with a similar title is in progress or already exists.",
      );
      }
    }
  };

  const debounceUpdate = useCallback(debounce(update, 1000), []);

  const handleChange = (data: Partial<z.infer<typeof DropletSchema>>) => {
    setError("");
    debounceUpdate(data);
  };

  return {
    error,
    handleChange,
  };
}
