"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { LoaderIcon, CornerDownLeft } from "lucide-react";

export function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" role="button">
      {pending ? (
        <div data-testid="loading-spinner">
          <LoaderIcon className="animate-spin" />
        </div>
      ) : (
        "Delete"
      )}
    </Button>
  );
}

export function AddButton() {
  const { pending } = useFormStatus();

  return (
    <Button size="sm">
      {pending ? <LoaderIcon className="animate-spin" /> : <CornerDownLeft />}
    </Button>
  );
}
