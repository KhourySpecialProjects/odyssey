"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { startTransition, useState } from "react";
import { User2Icon, X } from "lucide-react";
import { toast } from "sonner";
import { cancelFriendRequest } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { ProfileBlock } from "./profile-block";

export function FriendSentRequestsBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the profile navigation
    startTransition(async () => {
      const result = await cancelFriendRequest(user.id, request.id);
      if (result.success) {
        toast.success("Friend request removed");
      } else {
        toast.error("Failed to remove friend request");
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
            {request?.firstName ? (
              getInitials(request.firstName + " " + request.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p
            title={`${
              request.firstName && request.lastName
                ? `${request.firstName} ${request.lastName}`
                : request.email
            }`}
            className="inline-block max-w-[200px] truncate font-medium text-slate-900 md:max-w-sm dark:text-slate-300"
          >
            {request.firstName && request.lastName
              ? `${request.firstName} ${request.lastName}`
              : request.email}
          </p>
        </div>
        <ProfileBlock
          otherUser={request}
          user={user}
          isOpen={open}
          setIsOpen={setOpen}
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReject}
          className="scale-75 md:scale-100"
          role="x"
        >
          <div className="group relative">
            <X />
            <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Cancel Request
            </span>
          </div>
        </Button>
      </div>
    </li>
  );
}
