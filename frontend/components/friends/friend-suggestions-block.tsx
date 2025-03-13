"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import { startTransition } from "react";
import { sendFriendRequest } from "@/lib/requests/friends";
import { UserBlock } from "./user-block";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { User2Icon, UserRoundPlus } from "lucide-react";

export function FriendSuggestionsBlock({
  suggUser,
  curUser,
  display,
  requested,
}: {
  curUser: AuthorizedUser;
  suggUser: AuthorizedUser;
  display: boolean;
  requested: boolean;
}) {
  const handleRequest = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(curUser, suggUser);
      if (result.success) {
        toast.success("Request sent!");
      } else {
        toast.error("Failed to send request.");
      }
    });
  };

  return (
    <div
      className={`${
        requested === true && display === false
          ? "visibility: hidden"
          : "visibility: visible"
      }`}
    >
      <li className="py-0 [&:not(:first-child)]:pt-3">
        <div className="flex items-center md:space-x-4">
          <Avatar
            variant="round"
            className="border border-sky-800 w-12 h-12 scale-75 md:scale-100"
          >
            <AvatarImage src={suggUser?.profilePhoto || undefined} />
            <AvatarFallback>
              {suggUser?.firstName ? (
                getInitials(suggUser.firstName + " " + suggUser.lastName)
              ) : (
                <User2Icon />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p
              title={`${
                suggUser.firstName && suggUser.lastName
                  ? `${suggUser.firstName} ${suggUser.lastName}`
                  : suggUser.email
              }`}
              className="font-medium truncate overflow-hidden text-slate-900 dark:text-slate-300 max-w-[200px] md:max-w-[250px] inline-block"
            >
              {suggUser.firstName && suggUser.lastName
                ? suggUser.firstName + " " + suggUser.lastName
                : suggUser.email}
            </p>
          </div>

          <UserBlock user={suggUser} curUser={curUser} />

          <div className="inline-flex items-center">
            <Button
              size="sm"
              disabled={requested}
              onClick={handleRequest}
              className="text-white bg-sky-600 dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700 hover:bg-sky-700 hidden md:block w-32"
            >
              {requested ? "Sent!" : "Send Request"}
            </Button>
            <Button
              size="sm"
              disabled={requested}
              onClick={handleRequest}
              className="text-white bg-sky-600 dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700 hover:bg-sky-700 block md:hidden scale-75"
            >
              {requested ? <UserRoundPlus /> : <UserRoundPlus />}
            </Button>
          </div>
        </div>
      </li>
    </div>
  );
}
