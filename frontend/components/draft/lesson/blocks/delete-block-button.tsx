"use client";
import { useRef, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onDelete: () => void | Promise<void>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">;

/** Trash button for a lesson block. Spins and ignores clicks until the delete settles. */
export function DeleteBlockButton({ onDelete, className, ...rest }: Props) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const handleClick = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onDelete();
    } catch (error) {
      console.error("Failed to delete block", error);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Delete block"
      {...rest}
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "cursor-pointer text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
    </button>
  );
}
