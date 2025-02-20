"use client";

import { Button } from "@/components/ui/button";
import { removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User2Icon } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function FriendBlock({
  user,
  friend,
}: {
  user: AuthorizedUser;
  friend: AuthorizedUser;
}) {
  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeFriend(user.id, friend.id);
      if (result.success) {
        toast.success("Friend removed");
      } else {
        toast.error("Failed to remove friend");
      }
    });
  };
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <Avatar variant="round" className="border border-sky-800 w-12 h-12">
          <AvatarImage
            src={friend?.profilePhoto || undefined}
          />
          <AvatarFallback>
            {friend?.firstName ? (
              getInitials(friend.firstName + " " + friend.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {friend.firstName && friend.lastName
              ? `${friend.firstName} ${friend.lastName}`
              : friend.email}
          </p>
        </div>
        <UserBlock user={friend} curUser={user} />
        <div className="inline-flex items-center gap-2" onClick={handleRemove}>
          <Button size="sm" variant="destructive">
            Remove Friend
          </Button>
        </div>
      </div>
    </li>
  );
}
