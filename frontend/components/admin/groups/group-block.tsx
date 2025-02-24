"use client";

import { Button } from "@/components/ui/button";
import { updateGroup } from "@/lib/requests/groups";
import { Group } from "@/types";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function GroupBlock({ group }: { group: Group }) {
  const linkTo = `/g/management?slug=${group.slug}`;

  const handleUpdateGroup = async (formData: FormData) => {
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
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-black">
            {group.groupName}
            {group.isArchived ? " (Archived)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo}>
            <Button size="sm" variant="outline">
              <div className="relative group">
                <Pencil className="text-sky-600" />
                <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit Group
                </span>
              </div>
            </Button>
          </Link>
          <form action={handleUpdateGroup}>
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
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
