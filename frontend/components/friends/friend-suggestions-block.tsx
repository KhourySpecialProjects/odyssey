"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { toast } from "sonner";
import { startTransition, useState } from "react";
import { sendFriendRequest } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { User2Icon, UserRoundPlus } from "lucide-react";
import { ProfileBlock } from "./profile-block";

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

  const handleRequest = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the profile navigation
    startTransition(async () => {
      const result = await sendFriendRequest(curUser, suggUser);
      if (result.success) {
        toast.success("Request sent!");
      } else {
        toast.error("Failed to send request.");
      }
    });
  };
  const fid = suggUser.email?.slice(0, suggUser.email.indexOf("@")) || "";
  const handleProfileClick = () => {
    window.open(`/prof/${fid}`, "_self");
  };

  return (
    <div
      className={`${
        requested === true && display === false
          ? "visibility: hidden"
          : "visibility: visible"
      }`}
      role="mainBox"
    >
      <li className="py-0 [&:not(:first-child)]:pt-3">
        <div
          className="flex cursor-pointer items-center md:space-x-4"
          onClick={handleProfileClick}
        >
          <Avatar
            variant="round"
            className="h-12 w-12 scale-75 border border-sky-800 md:scale-100"
          >
            <AvatarImage src={suggUser?.profilePhoto || undefined} />
            <AvatarFallback>
              {suggUser.firstName && suggUser.lastName ? (
                getInitials(suggUser.firstName + " " + suggUser.lastName)
              ) : (
                <User2Icon />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p
              title={
                suggUser.firstName && suggUser.lastName
                  ? `${suggUser.firstName} ${suggUser.lastName}`
                  : suggUser.email
              }
              className="inline-block max-w-[200px] truncate overflow-hidden font-medium text-slate-900 md:max-w-[250px] dark:text-slate-300"
            >
              {suggUser.firstName && suggUser.lastName
                ? suggUser.firstName + " " + suggUser.lastName
                : suggUser.email}
            </p>
          </div>

          <ProfileBlock
            otherUser={suggUser}
            user={curUser}
            isFeed={false}
            isOpen={open}
            setIsOpen={setOpen}
          />

          <div
            className={`inline-flex items-center ${suggUser.id === curUser.id ? "visibility: hidden" : "visibility: visible"}`}
          >
            <Button
              size="sm"
              disabled={requested}
              onClick={handleRequest}
              className={`hidden w-32 bg-sky-600 text-white hover:bg-sky-700 md:block dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700`}
            >
              {requested ? "Sent!" : "Send Request"}
            </Button>
            <Button
              size="sm"
              disabled={requested}
              onClick={handleRequest}
              className="block scale-75 bg-sky-600 text-white hover:bg-sky-700 md:hidden dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700"
            >
              <UserRoundPlus />
            </Button>
          </div>
        </div>
      </li>
    </div>
  );
}
