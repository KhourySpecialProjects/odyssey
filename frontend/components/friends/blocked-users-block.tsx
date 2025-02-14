"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";
import { unblockUser } from "@/lib/requests/friends";
import { UserBlock } from "./user-block";

export function BlockedUsersBlock({
  user,
  blocked,
}: {
  user: AuthorizedUser;
  blocked: AuthorizedUser;
}) {
  const handleUnblock = () => {
    startTransition(async () => {
      const result = await unblockUser(user.id, blocked.id);
      if (result.success) {
        toast.success("User unblocked");
      } else {
        toast.error("Failed to unblock user");
      }
    });
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        {blocked.profilePhoto && (
          <img
            src={blocked.profilePhoto}
            alt={`${blocked.firstName}'s profile`}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {blocked.firstName && blocked.lastName
              ? `${blocked.firstName} ${blocked.lastName}`
              : blocked.email}
          </p>
          {blocked.bio && (
            <p className="text-sm truncate text-slate-500 dark:text-slate-400">
              {blocked.bio}
            </p>
          )}
        </div>
        <UserBlock user={blocked} curUser={user} />
        <div className="inline-flex items-center gap-2" onClick={handleUnblock}>
          <Button size="sm" >
            Unblock
          </Button>
        </div>
      </div>
    </li>
  );
}
