"use client";

import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { Check, X } from "lucide-react";
import { startTransition } from "react";
import { toast } from "sonner";
import { UserBlock } from "./user-block";

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
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        {request.profilePhoto && (
          <img
            src={request.profilePhoto}
            alt={`${request.firstName}'s profile`}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : request.email}
          </p>
          {request.bio && (
            <p className="text-sm truncate text-slate-500 dark:text-slate-400">
              {request.bio}
            </p>
          )}
        </div>
        <UserBlock user={request} curUser={user} />
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          size="sm"
          variant="outline"
          onClick={handleApprove}
        >
          <div className="relative group">
            <Check />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Accept
            </span>
          </div>
        </Button>
        <Button variant="destructive" size="sm" onClick={handleReject}>
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
