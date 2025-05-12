"use client";

import { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface MemberTileProps {
  member: User;
  role?: "admin" | "manager" | "member";
  onRemove?: (email: string) => void;
}

export function MemberTile({
  member,
  role = "member",
  onRemove,
}: MemberTileProps) {
  const initials = (member.email ?? "")
    .split("@")[0]
    .split(".")
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="group relative">
      <div className="rounded-lg border bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{member.email}</span>
            <Badge variant="outline" className="w-fit">
              {role}
            </Badge>
          </div>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove?.(member.email ?? "")}
          className="absolute top-2 right-2 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
        >
          <XCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
