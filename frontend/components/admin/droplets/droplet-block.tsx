"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/actions";
import { Droplet } from "@/types";
import { Pencil } from "lucide-react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import Link from "next/link";

export function DropletBlock({ droplet }: { droplet: Droplet }) {
  const linkTo = `/draft/d/${droplet.slug}`;

  const handleUpdateDroplet = async () => {
    const result = await updateDroplet(
      droplet.id,
      {
        isHidden: !droplet.isHidden,
        name: droplet.name,
        focusArea: droplet.focusArea,
        type: droplet.type,
        tagIds: droplet.tags?.map((tag) => tag.id) || [],
      },
      { revalidate: true },
    );

    if (result.ok) {
      toast.success(
        `Droplet ${!droplet.isHidden ? "hidden" : "shown"} successfully`,
      );
    } else {
      toast.error("Failed to update droplet visibility");
      console.error(result.error);
    }
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-slate-300">
            {droplet.name}
            {droplet.isHidden ? " (Hidden)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo}>
            <Button size="sm" className="bg-white dark:bg-slate-300">
              <div className="relative group">
                <Pencil className="text-sky-600" />
                <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
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
      className="text-slate-300 w-24"
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
