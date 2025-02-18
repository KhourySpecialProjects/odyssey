"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import { startTransition } from "react";
import { sendFriendRequest } from "@/lib/requests/friends";
import { UserBlock } from "./user-block";

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
  const [open, setOpen] = useState(false);

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
        <div className="flex items-center space-x-4">
          {suggUser.profilePhoto && (
            <img
              src={suggUser.profilePhoto}
              alt={`${suggUser.firstName}'s profile`}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-slate-900 dark:text-white">
              {suggUser.firstName && suggUser.lastName
                ? suggUser.firstName + " " + suggUser.lastName
                : suggUser.email}
            </p>
          </div>

          <UserBlock user={suggUser} curUser={curUser} />

          <div className="inline-flex items-center gap-2">
            <Button
              size="sm"
              disabled={requested}
              onClick={handleRequest}
              className="text-white bg-sky-600"
            >
              {requested ? "Sent!" : "Send Request"}
            </Button>
          </div>
        </div>
      </li>
    </div>
  );
}
