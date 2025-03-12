"use client";

import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { Check, User2Icon, X } from "lucide-react";
import { startTransition } from "react";
import { toast } from "sonner";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";

export function FriendRequestBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const handleApprove = () => {
    if (
      user.friendships.map((friendship) =>
        friendship.authorized_users.includes(request.id),
      )
    ) {
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

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectFriendRequest(user.id, request.id);
      if (result.success) {
        toast.success("Friend request rejected");
      } else {
        toast.error("Failed to reject friend request");
      }
    });
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3 ">
      <div className="flex items-center md:space-x-4">
        <Avatar variant="round" className="border border-sky-800 w-12 h-12 scale-75 md:scale-100">
          <AvatarImage src={request?.profilePhoto || undefined} />
          <AvatarFallback>
            {request?.firstName ? (
              getInitials(request.firstName + " " + request.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p  title={`${
              request.firstName && request.lastName
                ? `${request.firstName} ${request.lastName}`
                : request.email
            }`}
            className="font-medium truncate text-slate-900 dark:text-slate-300">
            {request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : request.email}
          </p>
        </div>
        <UserBlock user={request} curUser={user} />
        <Button
          className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 scale-75 md:scale-100"
          size="sm"
          onClick={handleApprove}
        >
          <div className="relative group">
            <Check />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Accept
            </span>
          </div>
        </Button>
        <Button
          className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 scale-75 md:scale-100"
          size="sm"
          onClick={handleReject}
        >
          <div className="relative group">
            <X />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Reject
            </span>
          </div>
        </Button>
      </div>
    </li>
  );
}
