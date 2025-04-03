"use client";

import { BlockUser, removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Github, Linkedin, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { FriendCompletedDroplets } from "./friend-completed-droplets";

export function ProfileBlock({
  user,
  otherUser,
  isOpen,
  setIsOpen,
  isFeed,
}: {
  user: AuthorizedUser;
  otherUser: AuthorizedUser;
  isOpen: boolean;
  setIsOpen: (member: boolean) => void;
  isFeed: boolean;
}) {
  const handleBlock = () => {
    startTransition(async () => {
      const result = await BlockUser(user.id, otherUser.id);
      await removeFriend(user.id, otherUser.id);
      if (result.success) {
        toast.success("User blocked");
      } else {
        toast.error("Failed to block user");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {!isFeed && (
          <div>
            <Button
              size="sm"
              className="bg-sky-300 text-black hover:bg-sky-400 dark:bg-sky-300 dark:hover:bg-sky-400 hidden md:block"
            >
              View Profile
            </Button>

            <Button
              size="sm"
              className="bg-sky-300 text-black hover:bg-sky-400 dark:bg-sky-300 dark:hover:bg-sky-400 block md:hidden scale-75"
            >
              <UserRound />
            </Button>
          </div>
        )}
      </DialogTrigger>

      <DialogContent className="dark:bg-slate-700">
        <DialogHeader>
          <div className="flex justify-center items-center">
            <Avatar
              variant="round"
              className="border border-sky-800 w-20 h-20 items-center"
            >
              <AvatarImage src={otherUser?.profilePhoto || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(otherUser.firstName + " " + otherUser.lastName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle style={{ fontSize: "2rem", textAlign: "center" }}>
            {otherUser.firstName} {otherUser.lastName}
          </DialogTitle>
          <div className="flex justify-center space-x-2">
            {otherUser.linkedin && (
              <Link href={otherUser.linkedin} legacyBehavior role="link">
                <a target="_blank" rel="noopener noreferrer">
                  <Linkedin />
                </a>
              </Link>
            )}
            {otherUser.github && (
              <Link href={otherUser.github} legacyBehavior role="link">
                <a target="_blank" rel="noopener noreferrer">
                  <Github />
                </a>
              </Link>
            )}
          </div>
          {otherUser.bio && (
            <DialogDescription className="dark:text-slate-300">
              {otherUser.bio}
            </DialogDescription>
          )}
          <hr className="dark:text-slate-300"></hr>
          <DialogDescription className="text-center font-bold dark:text-slate-300">
            Completed Droplets:{" "}
          </DialogDescription>
          <FriendCompletedDroplets friend={otherUser} />
          <div
            className={`inline-flex items-center gap-2 ${otherUser === user || user.blocked.includes(otherUser) ? "visibility: hidden" : "visibility: visible"}`}
            onClick={handleBlock}
            data-testid="block-button-container"
          >
            <Button
              size="sm"
              className="bg-red-600 dark:bg-red-400 text-white hover:bg-red-700"
            >
              Block user
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
