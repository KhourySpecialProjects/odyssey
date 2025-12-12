"use client";

import { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useState } from "react";

interface MemberTileProps {
  member: User;
  onRemove?: (email: string) => void;
}

export function MemberTile({ member, onRemove }: MemberTileProps) {
  const initials = (member.email ?? "")
    .split("@")[0]
    .split(".")
    .map((part) => part[0].toUpperCase())
    .join("");

  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="group relative">
      <div className="rounded-lg border bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative md:static">
            <div
              onClick={() => {
                setShowEmail((prev) => !prev);
              }}
              className="cursor-pointer"
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>

            <div
              className={`absolute left-0 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-sm text-white transition-opacity duration-200 ${showEmail ? "opacity-100" : "pointer-events-none opacity-0"} md:pointer-events-auto md:static md:ml-0 md:translate-y-0 md:bg-transparent md:p-0 md:text-slate-900 md:opacity-100 md:dark:text-white`}
            >
              {member.email}
            </div>
          </div>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove?.(member.email ?? "")}
          className="absolute right-2 top-2 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <XCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
