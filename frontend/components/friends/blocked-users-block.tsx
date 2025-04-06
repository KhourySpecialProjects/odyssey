"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { unblockUser } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { ProfileBlock } from "./profile-block";
import { User2Icon } from "lucide-react";

export function BlockedUsersBlock({
  user,
  blocked,
}: {
  user: AuthorizedUser;
  blocked: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);

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
      <div className="flex items-center md:space-x-4">
        <Avatar
          variant="round"
          className="border border-sky-800 w-12 h-12 scale-75 md:scale-100"
        >
          <AvatarImage src={blocked?.profilePhoto || undefined} />
          <AvatarFallback>
            {blocked.firstName && blocked.lastName ? (
              getInitials(blocked.firstName + " " + blocked.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p
            title={
              blocked.firstName && blocked.lastName
                ? `${blocked.firstName} ${blocked.lastName}`
                : `${blocked.email}`
            }
            className="font-medium truncate overflow-hidden text-slate-900 text-slate-900 dark:text-slate-300 max-w-[175px] md:max-w-sm inline-block"
          >
            {blocked.firstName && blocked.lastName
              ? blocked.firstName + " " + blocked.lastName
              : blocked.email}
          </p>
        </div>
        <div className="flex items-center -space-x-1 md:space-x-4">
          <ProfileBlock
            otherUser={blocked}
            user={user}
            isFeed={false}
            isOpen={open}
            setIsOpen={setOpen}
          />
          <div className="flex items-center" onClick={handleUnblock}>
            <Button
              size="sm"
              className="scale-75 md:scale-100 dark:bg-black dark:text-white dark:hover:bg-slate-800 dark:border dark:border-slate-500"
            >
              Unblock
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
