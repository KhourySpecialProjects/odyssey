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
    <div className="relative group">
      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors">
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
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove?.(member.email ?? "")}
          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <XCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
