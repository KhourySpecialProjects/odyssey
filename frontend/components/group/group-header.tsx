"use client";

import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GroupHeaderProps {
  group: Group;
  canEdit?: boolean;
}

export function GroupHeader({ group, canEdit }: GroupHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex justify-between items-start">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {group.groupName}
        </h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline">{group.semester}</Badge>
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-col space-y-2">
          <Link href={`/g/management?slug=${group.slug}`}>
            <Button
              variant="default"
              className="gap-2 dark:bg-slate-800 border dark:border-slate-500 dark:text-white dark:hover:text-slate-800 w-36"
            >
              <PencilIcon size={17} />
              Edit Group
            </Button>
          </Link>
          <Link href={`/g/due-dates?slug=${group.slug}`}>
            <Button
              variant="default"
              className="gap-2 dark:bg-slate-800 border dark:border-slate-500 dark:text-white dark:hover:text-slate-800 w-36"
            >
              <Clock size={17} /> Due Dates
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
