"use client";

import { useState, useCallback, useContext } from "react";
import { z } from "zod";
import { DropletSchema } from "@/lib/validations/droplet";
import { debounce } from "lodash";
import { usePathname, redirect, useRouter } from "next/navigation";
import { updateDroplet } from "@/lib/actions";

export function useDropletUpdate(dropletId: number) {
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState();
  const router = useRouter();

  const update = async (data: Partial<z.infer<typeof DropletSchema>>) => {
    const response = await updateDroplet(dropletId, data);
    if (!response.error && response.data) {
      setError("");
      if (data.name) {
        router.push(`/draft/d/${response.data.attributes.slug}`);
      }
    } else {
      setError("Error updating droplet");
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
