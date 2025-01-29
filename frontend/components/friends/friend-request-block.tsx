"use client";

import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { Check, Github, Linkedin, X } from "lucide-react";
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
import { FriendCompletedDroplets } from "./friend-completed-droplets";

export function FriendRequestBlock({
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              View Profile
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              {request.profilePhoto && (
                <div className="flex justify-center items-center">
                  <img
                    src={request.profilePhoto}
                    alt={`${request.firstName}'s profile`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
              )}
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
              <DialogDescription>Email: {request.email}</DialogDescription>
              {request.bio && (
                <DialogDescription>Bio: {request.bio}</DialogDescription>
              )}
              <DialogDescription>Completed Droplets: </DialogDescription>
              <FriendCompletedDroplets friend={request} />
            </DialogHeader>
          </DialogContent>
        </Dialog>
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
