import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import Link from "next/link";

interface GroupHeaderProps {
  group: Group;
  canEdit?: boolean;
}

export function GroupHeader({ group, canEdit }: GroupHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {group.groupName}
        </h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline">{group.semester}</Badge>
        </div>
      </div>
      {canEdit && (
        <Link href={`/g/management?slug=${group.slug}`}>
          <Button variant="default" className="gap-2">
            <PencilIcon className="h-4 w-4" />
            Edit Group
          </Button>
        </Link>
      )}
    </div>
  );
}
