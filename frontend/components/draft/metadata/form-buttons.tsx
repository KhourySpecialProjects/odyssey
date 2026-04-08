"use client";

import { useFormStatus } from "react-dom";
import { LoaderIcon } from "lucide-react";
import { IconCornerDownLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

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
    <button
      type="submit"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
      disabled={pending}
    >
      {pending ? (
        <LoaderIcon className="h-5 w-5 animate-spin" />
      ) : (
        <IconCornerDownLeft className="h-5 w-5" stroke={1.8} />
      )}
    </button>
  );
}
