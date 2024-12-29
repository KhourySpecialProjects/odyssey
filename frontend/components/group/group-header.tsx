import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";

export function GroupHeader({ group }: { group: Group }) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {group.groupName}
      </h1>
      <div className="flex items-center gap-4">
        <Badge variant="outline">{group.semester}</Badge>
      </div>
    </div>
  );
}