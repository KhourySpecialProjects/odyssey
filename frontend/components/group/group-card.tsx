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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold">{group.groupName}</h3>
            <Badge className={roleColors[role]}>{role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(role === "creator" || role === "admin" || role === "manager") && (
            <div className="flex items-center gap-4 text-sm text-slate-600">
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
