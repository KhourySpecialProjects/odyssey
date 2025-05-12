"use client";

import { Button } from "@/components/ui/button";
import { updateGroup } from "@/lib/requests/groups";
import { Group } from "@/types";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function GroupBlock({ group: initialGroup }: { group: Group }) {
  const [group, setGroup] = useState(initialGroup);
  const linkTo = `/g/management?slug=${group.slug}`;

  const handleUpdateGroup = async () => {
    setGroup((prev) => ({ ...prev, isArchived: !prev.isArchived }));
    const result = await updateGroup(group.id, {
      isArchived: !group.isArchived,
      groupName: group.groupName,
    });

    if (result) {
      toast.success(
        `Group ${!group.isArchived ? "archived" : "unarchived"} successfully`,
      );
    } else {
      toast.error("Failed to update group visibility");
    }
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-slate-300">
            {group.groupName}
            {group.isArchived ? " (Archived)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-white dark:bg-slate-300">
              <div className="group relative">
                <Pencil className="text-sky-600" />
                <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Edit Group
                </span>
              </div>
            </Button>
          </Link>
          <form action={handleUpdateGroup} data-testid="group-form">
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={group.id}
              hidden
            />
            <input
              id="isArchived"
              name="isArchived"
              type="text"
              defaultValue={String(!group.isArchived)}
              hidden
            />
            <SubmitButton destructive={!group.isArchived}>
              {group.isArchived ? "Unarchive Group" : "Archive Group"}
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
      className="w-28 dark:text-slate-300"
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
