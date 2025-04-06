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
      <div className="flex flex-row items-start mt-2 gap-2 items-center">
        <Avatar
          variant="round"
          className="border border-sky-800 w-8 h-8 flex-shrink-0"
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
          className="flex-1 min-w-0"
          title={
            request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : `${request.email}`
          }
        >
          <div className="w-full ">
            <p className="font-medium truncate text-slate-900 dark:text-slate-300 text-left">
              {request.firstName && request.lastName
                ? request.firstName + " " + request.lastName
                : request.email}
            </p>
          </div>
        </button>

        <div className="flex flex-col gap-1 justify-center">
          <Button
            className="bg-emerald-400 dark:bg-emerald-700 dark:hover:bg-emerald-800 hover:text-white hover:bg-emerald-600 text-white mr-3 flex items-center justify-center"
            style={{ height: "20px", width: "50px" }}
            size="sm"
            variant="outline"
            onClick={handleApprove}
            role="accept"
          >
            <div className="relative group">
              <Check className="w-3 h-3 group-hover:scale-110 transition-transform" />
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
            <div className="relative group">
              <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
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
          isFeed={true}
        />
      </div>
    </div>
  );
}
