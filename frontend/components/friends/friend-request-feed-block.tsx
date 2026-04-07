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

export function FriendRequestFeedBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);

  const handleApprove = () => {
    startTransition(async () => {
      const result = await acceptFriendRequest(user.id, request.id);
      if (result.success) {
        toast.success("Friend request accepted!");
      } else {
        toast.error("Failed to accept friend request");
      }
    });
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

  const displayName =
    request.firstName && request.lastName
      ? `${request.firstName} ${request.lastName}`
      : request.email;

  return (
    <div className="flex flex-col justify-center">
      <div className="mt-2 flex flex-row items-center gap-2">
        <Avatar
          variant="round"
          className="h-10 w-10 flex-shrink-0 border border-slate-200"
        >
          <AvatarImage src={request?.profilePhoto || undefined} />
          <AvatarFallback className="text-base font-normal text-black">
            {request.firstName && request.lastName ? (
              getInitials(request.firstName + " " + request.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>

        <button
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1"
          title={displayName}
        >
          <div className="w-full text-left">
            <p className="truncate text-sm font-medium text-[#475569] dark:text-slate-300">
              {displayName}
            </p>
            {request.firstName && request.lastName && (
              <p className="truncate text-xs text-[#475569] dark:text-slate-400">
                {request.email}
              </p>
            )}
          </div>
        </button>

        <div className="flex flex-row items-center gap-1">
          <Button
            className="h-[28px] w-[28px] flex-shrink-0 rounded-full border border-emerald-500 bg-white p-0 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-500 dark:bg-slate-900 dark:hover:bg-slate-800"
            size="icon"
            variant="outline"
            onClick={handleApprove}
            role="accept"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            className="h-[28px] w-[28px] flex-shrink-0 rounded-full border border-red-500 bg-white p-0 text-red-500 hover:bg-red-50 hover:text-red-500 dark:bg-slate-900 dark:hover:bg-slate-800"
            size="icon"
            variant="outline"
            onClick={handleReject}
            role="reject"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProfileBlock
        user={user}
        otherUser={request}
        isOpen={open}
        setIsOpen={setOpen}
      />
    </div>
  );
}
