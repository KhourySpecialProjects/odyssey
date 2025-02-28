import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { UsersIcon } from "lucide-react";
import Link from "next/link";

type GroupCardProps = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
  roleColors: Record<string, string>;
};

export function GroupCard({ group, role, roleColors }: GroupCardProps) {
  return (
    <Link href={`/g/${group.slug}`}>
      <Card className="hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-800 border rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <h3 className="text-3xl font-black text-slate-950 place-self-end dark:text-slate-300">
              {group.groupName}
            </h3>
            <Badge className={roleColors[role]}>{role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(role === "creator" || role === "admin" || role === "manager") && (
            <div className="flex items-center gap-4 text-sm light:text-slate-600 dark:text-slate-300">
              <UsersIcon className="h-4 w-4" />
              <div className="flex gap-3">
                <span>Admins: {group.admins?.length || 0}</span>
                <span>Managers: {group.managers?.length || 0}</span>
                <span>Members: {group.members?.length || 0}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
