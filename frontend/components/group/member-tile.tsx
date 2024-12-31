"use client";

import { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MemberTileProps {
  member: User;
  role?: "admin" | "manager" | "member";
}

export function MemberTile({ member, role = "member" }: MemberTileProps) {
  const initials = (member.email ?? "")
    .split("@")[0]
    .split(".")
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{member.email}</span>
          <Badge variant="outline" className="w-fit">
            {role}
          </Badge>
        </div>
      </div>
    </div>
  );
}