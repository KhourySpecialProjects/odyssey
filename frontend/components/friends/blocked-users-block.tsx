"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";
import { unblockUser } from "@/lib/requests/friends";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { User2Icon } from "lucide-react";

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
        <Avatar variant="round" className="border border-sky-800 w-12 h-12">
          <AvatarImage
            src={blocked?.profilePhoto || undefined}
          />
          <AvatarFallback>
            {blocked?.firstName ? (
              getInitials(blocked.firstName + " " + blocked.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {blocked.firstName && blocked.lastName
              ? `${blocked.firstName} ${blocked.lastName}`
              : blocked.email}
          </p>
        </div>
        <UserBlock user={blocked} curUser={user} />
        <div className="inline-flex items-center gap-2" onClick={handleUnblock}>
          <Button size="sm">Unblock</Button>
        </div>
      </div>
    </li>
  );
}
