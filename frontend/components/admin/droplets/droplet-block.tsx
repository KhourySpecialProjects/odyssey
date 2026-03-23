"use client";

import { Button } from "@/components/ui/button";
import { Droplet } from "@/types";
import { IconPencil } from "@tabler/icons-react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";
import { updateDroplet } from "@/lib/requests/droplet";

export function DropletBlock({
  droplet: initialDroplet,
}: {
  droplet: Droplet;
}) {
  const [droplet, setDroplet] = useState(initialDroplet);
  const linkTo = `/draft/d/${droplet.slug}`;

  const handleUpdateDroplet = async () => {
    setDroplet((prev) => ({ ...prev, isHidden: !prev.isHidden }));

    const result = await updateDroplet(droplet.id, {
      isHidden: !droplet.isHidden,
      name: droplet.name,
      focusArea: droplet.focusArea,
      type: droplet.type,
      tagIds: droplet.tags?.map((tag) => tag.id) || [],
    });

    if (result.ok) {
      toast.success(
        `Droplet ${!droplet.isHidden ? "hidden" : "shown"} successfully`,
      );
    } else {
      setDroplet((prev) => ({ ...prev, isHidden: !prev.isHidden }));
      toast.error("Failed to update droplet visibility");
      console.error(result.error);
    }
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-slate-300">
            {droplet.name}
            {droplet.isHidden ? " (Hidden)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-white dark:bg-slate-300">
              <div className="group relative">
                <IconPencil className="text-sky-600" />
                <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Edit Droplet
                </span>
              </div>
            </Button>
          </Link>
          <form action={handleUpdateDroplet}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={droplet.id}
              hidden
            />
            <input
              id="isHidden"
              name="isHidden"
              type="text"
              defaultValue={String(!droplet.isHidden)}
              hidden
            />
            <SubmitButton destructive={!droplet.isHidden}>
              {droplet.isHidden ? "Show Droplet" : "Hide Droplet"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </li>
  );
}

function SubmitButton({
  destructive,
  children,
}: {
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={destructive ? "destructive" : "link"}
      className="w-24"
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
