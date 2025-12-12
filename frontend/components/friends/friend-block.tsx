"use client";

import { Button } from "@/components/ui/button";
import { removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User2Icon, X } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { ProfileBlock } from "./profile-block";

export function FriendBlock({
  user,
  friend,
}: {
  user: AuthorizedUser;
  friend: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the profile navigation
    startTransition(async () => {
      const result = await removeFriend(user.id, friend.id);
      if (result.success) {
        toast.success("Friend removed");
      } else {
        toast.error("Failed to remove friend");
      }
    });
  };
  const fid = friend.email?.split("@")[0] || "";
  const handleProfileClick = () => {
    if (fid) {
      window.location.href = `/prof/${fid}`;
    } else {
      toast.error("Invalid user profile");
      return;
    }
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div
        className="flex cursor-pointer items-center md:space-x-4"
        onClick={handleProfileClick}
      >
        <Avatar
          variant="round"
          className="h-12 w-12 scale-75 border border-sky-800 md:scale-100"
        >
          <AvatarImage src={friend?.profilePhoto || undefined} />
          <AvatarFallback>
            {friend.firstName && friend.lastName ? (
              getInitials(friend.firstName + " " + friend.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p
            title={
              friend.firstName && friend.lastName
                ? `${friend.firstName} ${friend.lastName}`
                : `${friend.email}`
            }
            className="inline-block max-w-[200px] truncate overflow-hidden font-medium text-slate-900 md:max-w-sm dark:text-slate-300"
          >
            {friend.firstName && friend.lastName
              ? friend.firstName + " " + friend.lastName
              : friend.email}
          </p>
        </div>
        <ProfileBlock
          otherUser={friend}
          user={user}
          isOpen={open}
          setIsOpen={setOpen}
        />
        <div className="inline-flex items-center" onClick={handleRemove}>
          <Button
            size="sm"
            variant="destructive"
            className="hidden w-32 md:block"
          >
            Remove Friend
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="block scale-75 md:hidden"
          >
            <X></X>
          </Button>
        </div>
      </div>
    </li>
  );
}
