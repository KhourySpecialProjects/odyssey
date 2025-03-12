"use client";

import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { Check, User2Icon, X } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import { FriendCompletedDroplets } from "./friend-completed-droplets";
import { BlockUser } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";

export function FriendRequestFeedBlock({
  user,
  request,
}: {
  user: AuthorizedUser;
  request: AuthorizedUser;
}) {
  const [open, setOpen] = useState(false);
  const handleBlock = () => {
    startTransition(async () => {
      const result = await BlockUser(user.id, request.id);
      await removeFriend(user.id, request.id);
      if (result.success) {
        toast.success("User blocked");
      } else {
        toast.error("Failed to block user");
      }
    });
  };

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
      <div className="flex flex-row items-start mt-2">
        <Avatar variant="round" className="border border-sky-800 w-8 h-8">
          <AvatarImage src={request?.profilePhoto || undefined} />
          <AvatarFallback>
            {request?.firstName ? (
              getInitials(request.firstName + " " + request.lastName)
            ) : (
              <User2Icon />
            )}
          </AvatarFallback>
        </Avatar>

        <button onClick={() => setOpen(true)}>
          <div className="flex-1 min-w-0 pl-2 overflow-hidden">
            <p className="font-medium truncate text-slate-900 dark:text-slate-300">
              {request.firstName && request.lastName
                ? `${request.firstName} ${request.lastName}`
                : request.email}
            </p>
          </div>
        </button>
      </div>

      <div className="flex flex-row justify-center mt-2">
        <Button
          className="bg-green-600 dark:bg-green-900 text-white hover:bg-green-700 dark:hover:bg-green-600 hover:text-white mr-3 flex items-center justify-center"
          style={{ height: "15px", width: "50px" }}
          size="sm"
          variant="outline"
          onClick={handleApprove}
        >
          <div className="relative group">
            <Check className="w-3 h-3 group-hover:scale-110 transition-transform" />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Accept
            </span>
          </div>
        </Button>
        <Button
          className="flex items-center justify-center bg-red-600 dark:bg-red-900 text-white hover:bg-red-700 dark:hover:bg-red-600 dark:text-white"
          size="sm"
          onClick={handleReject}
          style={{ height: "15px", width: "50px" }}
        >
          <div className="relative group">
            <X className="w-3 h-3" />
            <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Reject
            </span>
          </div>
        </Button>
      </div>

      <div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild></DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <div className="flex justify-center items-center">
                <Avatar
                  variant="round"
                  className="border border-sky-800 w-20 h-20 items-center"
                >
                  <AvatarImage src={request?.profilePhoto || undefined} />
                  <AvatarFallback className="text-2xl">
                    {request?.firstName ? (
                      getInitials(request.firstName + " " + request.lastName)
                    ) : (
                      <User2Icon />
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              <DialogTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                {request.firstName} {request.lastName}
              </DialogTitle>
              <div className="flex justify-center space-x-2">
                {request.linkedin && (
                  <Link href={request.linkedin} legacyBehavior>
                    <a target="_blank" rel="noopener noreferrer">
                      <Linkedin />
                    </a>
                  </Link>
                )}
                {request.github && (
                  <Link href={request.github} legacyBehavior>
                    <a target="_blank" rel="noopener noreferrer">
                      <Github />
                    </a>
                  </Link>
                )}
              </div>
              {request.bio && (
                <DialogDescription>{request.bio}</DialogDescription>
              )}
              <DialogDescription className="text-center font-bold">
                Completed Droplets:{" "}
              </DialogDescription>
              <FriendCompletedDroplets friend={request} />
              <div
                className={`inline-flex items-center gap-2 ${user.blocked.includes(request) ? "visibility: hidden" : "visibility: visible"}`}
                onClick={handleBlock}
              >
                <Button size="sm" variant="destructive">
                  Block user
                </Button>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
