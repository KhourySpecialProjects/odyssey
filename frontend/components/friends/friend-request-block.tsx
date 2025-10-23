"use client";

import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { Check, User2Icon, X } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { ProfileBlock } from "./profile-block";

export function FriendRequestBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the profile navigation
    const friendshipExists = user.friendships.some((friendship) =>
      friendship.authorized_users.includes(request.id),
    );
    if (friendshipExists) {
      startTransition(async () => {
        await rejectFriendRequest(user.id, request.id);
        toast.error("Friendship already exists with this user");
      });
    } else {
      startTransition(async () => {
        const result = await acceptFriendRequest(user.id, request.id);

        if (result.success) {
          toast.success("Friend request accepted!");
        } else {
          toast.error("Failed to accept friend request");
        }
      });
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the profile navigation
    startTransition(async () => {
      const result = await rejectFriendRequest(user.id, request.id);
      if (result.success) {
        toast.success("Friend request rejected");
      } else {
        toast.error("Failed to reject friend request");
      }
    });
  };

  const fid = request.email?.split("@")[0] || "";
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
          <AvatarImage src={request?.profilePhoto || undefined} />
          <AvatarFallback>
            {request.firstName && request.lastName ? (
              getInitials(request.firstName + " " + request.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p
            title={
              request.firstName && request.lastName
                ? `${request.firstName} ${request.lastName}`
                : `${request.email}`
            }
            className="truncate font-medium text-slate-900 dark:text-slate-300"
          >
            {request.firstName && request.lastName
              ? request.firstName + " " + request.lastName
              : request.email}
          </p>
        </div>
        <ProfileBlock
          otherUser={request}
          user={user}
          isFeed={false}
          isOpen={open}
          setIsOpen={setOpen}
        />
        <Button
          className="scale-75 bg-green-600 text-white hover:bg-green-700 md:scale-100 dark:bg-green-600 dark:hover:bg-green-700"
          size="sm"
          onClick={handleApprove}
          role="accept"
        >
          <div className="group relative">
            <Check />
            <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Accept
            </span>
          </div>
        </Button>
        <Button
          className="scale-75 bg-red-600 text-white hover:bg-red-700 md:scale-100 dark:bg-red-600 dark:hover:bg-red-700"
          size="sm"
          onClick={handleReject}
          role="reject"
        >
          <div className="group relative">
            <X />
            <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Reject
            </span>
          </div>
        </Button>
      </div>
    </li>
  );
}
