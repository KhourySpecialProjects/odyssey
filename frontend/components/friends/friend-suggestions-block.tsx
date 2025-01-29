"use client";

import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { useState } from "react";
import {
  DialogHeader,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { startTransition, useEffect } from "react";
import { sendFriendRequest, getSentRequest } from "@/lib/requests/friends";
import { Github, Linkedin } from "lucide-react";

export function FriendSuggestionsBlock({
  suggUser,
  curUser,
  display,
}: {
  curUser: AuthorizedUser;
  suggUser: AuthorizedUser;
  display: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequest = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(curUser, suggUser);
      if (result.success) {
        toast.success("Request sent!");
        setRequestSent(true);
      } else {
        toast.error("Failed to send request.");
      }
    });
  };

  useEffect(() => {
    const handleSentRequest = async () => {
      const result = await getSentRequest(curUser, suggUser);
      setRequestSent(result);
    };
    handleSentRequest();
  }, [curUser, suggUser]);

  return (
    <div
      className={`${
        requestSent === true && display === false ? "visibility: hidden" : "visibility: visible"
      }`}
    >
      <li className="py-0 [&:not(:first-child)]:pt-3">
        <div className="flex items-center space-x-4">
          {suggUser.profilePhoto?.formats?.thumbnail?.url && (
            <img
              src={suggUser.profilePhoto.formats.thumbnail.url}
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                View Profile
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                  {suggUser.firstName} {suggUser.lastName}
                </DialogTitle>
                <div className="flex justify-center space-x-2">
                  {suggUser.linkedin && (
                    <Link href={suggUser.linkedin} legacyBehavior>
                      <a target="_blank" rel="noopener noreferrer">
                        <Linkedin />
                      </a>
                    </Link>
                  )}
                  {suggUser.github && (
                    <Link href={suggUser.github} legacyBehavior>
                      <a target="_blank" rel="noopener noreferrer">
                        <Github />
                      </a>
                    </Link>
                  )}
                </div>
                <DialogDescription>Email: {suggUser.email}</DialogDescription>
                {suggUser.bio && (
                  <DialogDescription>Bio: {suggUser.bio}</DialogDescription>
                )}
                <DialogDescription>Completed Droplets: </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <div className="inline-flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={requestSent}
              onClick={handleRequest}
              className="text-white bg-sky-600"
            >
              {requestSent ? "Sent!" : "Send Request"}
            </Button>
          </div>
        </div>
      </li>
      </div>
  );
}
