"use client";

import { Button } from "@/components/ui/button";
import { removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User2Icon, X } from "lucide-react";
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
      <div className="flex items-center md:space-x-4">
        <Avatar
          variant="round"
          className="border border-sky-800 w-12 h-12 scale-75 md:scale-100"
        >
          <AvatarImage src={friend?.profilePhoto || undefined} />
          <AvatarFallback>
            {getInitials(friend.firstName + " " + friend.lastName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p
            title={`${friend.firstName} ${friend.lastName}`}
            className="font-medium truncate overflow-hidden text-slate-900 dark:text-slate-300 max-w-[200px] md:max-w-sm inline-block"
          >
            {friend.firstName} {friend.lastName}
          </p>
        </div>
        <UserBlock user={friend} curUser={user} />
        <div className="inline-flex items-center " onClick={handleRemove}>
          <Button
            size="sm"
            variant="destructive"
            className="hidden md:block w-32"
          >
            Remove Friend
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="block md:hidden scale-75"
          >
            <X></X>
          </Button>
        </div>
      </div>
    </li>
  );
}
