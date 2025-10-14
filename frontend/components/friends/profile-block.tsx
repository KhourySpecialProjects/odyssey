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
import { Github, Linkedin, User2Icon, UserRound } from "lucide-react";
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
  isProfile,
}: {
  user: AuthorizedUser;
  otherUser: AuthorizedUser;
  isOpen: boolean;
  setIsOpen: (member: boolean) => void;
  isFeed: boolean;
  isProfile?: boolean;
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
      <DialogContent className="dark:bg-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-center">
            <Avatar
              variant="round"
              className="h-20 w-20 items-center border border-sky-800"
            >
              <AvatarImage src={otherUser?.profilePhoto || undefined} />
              <AvatarFallback className="text-2xl">
                {otherUser.firstName && otherUser.lastName ? (
                  getInitials(otherUser.firstName + " " + otherUser.lastName)
                ) : (
                  <User2Icon />
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle style={{ fontSize: "2rem", textAlign: "center" }}>
            {otherUser.firstName && otherUser.lastName
              ? otherUser.firstName + " " + otherUser.lastName
              : otherUser.email}
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
            className={`inline-flex items-center gap-2 ${otherUser.id === user.id || user.blocked.includes(otherUser) ? "visibility: hidden" : "visibility: visible"}`}
            onClick={handleBlock}
            data-testid="block-button-container"
          >
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-400"
            >
              Block user
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
