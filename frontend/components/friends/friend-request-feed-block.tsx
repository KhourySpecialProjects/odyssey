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

  return (
    <div className="flex flex-col justify-center">
      <div className="mt-2 flex flex-row items-center gap-2">
        <Avatar
          variant="round"
          className="h-8 w-8 flex-shrink-0 border border-sky-800"
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

        <button
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1"
          title={
            request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : `${request.email}`
          }
        >
          <div className="w-full">
            <p className="truncate text-left font-medium text-slate-900 dark:text-slate-300">
              {request.firstName && request.lastName
                ? request.firstName + " " + request.lastName
                : request.email}
            </p>
          </div>
        </button>

        <div className="flex flex-col justify-center gap-1">
          <Button
            className="flex items-center justify-center bg-emerald-400 text-white hover:bg-emerald-600 hover:text-white dark:bg-emerald-700 dark:hover:bg-emerald-800"
            style={{ height: "20px", width: "50px" }}
            size="sm"
            variant="outline"
            onClick={handleApprove}
            role="accept"
          >
            <div className="group relative">
              <Check className="h-3 w-3 transition-transform group-hover:scale-110" />
            </div>
          </Button>
          <Button
            className="flex items-center justify-center hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
            variant="destructive"
            size="sm"
            onClick={handleReject}
            style={{ height: "20px", width: "50px" }}
            role="reject"
          >
            <div className="group relative">
              <X className="h-3 w-3 transition-transform group-hover:scale-110" />
            </div>
          </Button>
        </div>
      </div>

      <div>
        <ProfileBlock
          user={user}
          otherUser={request}
          isOpen={open}
          setIsOpen={setOpen}
        />
      </div>
    </div>
  );
}
