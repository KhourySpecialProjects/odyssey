"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { startTransition, useState } from "react";
import { User2Icon, X } from "lucide-react";
import { toast } from "sonner";
import { cancelFriendRequest } from "@/lib/requests/friends";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";

export function FriendSentRequestsBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const handleReject = () => {
    startTransition(async () => {
      const result = await cancelFriendRequest(user.id, request.id);
      if (result.success) {
        toast.success("Friend request rejected");
      } else {
        toast.error("Failed to reject friend request");
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
          <p
            title={`${
              request.firstName && request.lastName
                ? `${request.firstName} ${request.lastName}`
                : request.email
            }`}
            className="font-medium truncate text-slate-900 dark:text-slate-300 max-w-[200px] md:max-w-sm inline-block"
          >
            {request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : request.email}
          </p>
        </div>
        <UserBlock user={request} curUser={user} />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReject}
          className="scale-75 md:scale-100"
          role="x"
        >
          <div className="relative group">
            <X />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Cancel Request
            </span>
          </div>
        </Button>
      </div>
    </li>
  );
}
