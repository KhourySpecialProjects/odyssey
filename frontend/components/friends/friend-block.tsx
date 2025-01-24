"use client";

import { Button } from "@/components/ui/button";
import { removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Linkedin, Github } from "lucide-react";
import { getInitials } from "@/lib/utils";



export function FriendBlock({ user, friend }: { user: AuthorizedUser, friend: AuthorizedUser }) {
  const [open, setOpen] = useState(false);

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeFriend(user.id, friend.id);
      if (result.success) {
        toast.success("Friend removed");
      } else {
        toast.error("Failed to remove friend");
      }
    });
  };
    return (
      <li className="py-0 [&:not(:first-child)]:pt-3">
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-slate-900 dark:text-white">
              {friend.firstName && friend.lastName 
                ? `${friend.firstName} ${friend.lastName}`
                : friend.email}
            </p>
            {friend.bio && (
              <p className="text-sm truncate text-slate-500 dark:text-slate-400">
                {friend.bio}
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
              {friend.firstName && friend.lastName ? (
                      <div className="flex justify-center items-center">
                      <Avatar variant="round" size="lg">
                        <AvatarFallback className="text-3xl">
                          {getInitials(friend.firstName + " " + friend.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    ) : null}
              <DialogTitle style={{ fontSize: '2rem', textAlign: 'center' }}>
                {friend.firstName} {friend.lastName}
              </DialogTitle>
                  <div className="flex justify-center space-x-2">
                    {friend.linkedin && (
                      <Link href={friend.linkedin} legacyBehavior>
                        <a target="_blank" rel="noopener noreferrer">
                          <Linkedin />
                        </a>
                      </Link>
                    )}
                    {friend.github && (
                      <Link href={friend.github} legacyBehavior>
                        <a target="_blank" rel="noopener noreferrer">
                          <Github />
                        </a>
                      </Link>
                    )}
                  </div>
                <DialogDescription>Email: {friend.email}</DialogDescription>
                {friend.bio && <DialogDescription>Bio: {friend.bio}</DialogDescription>}
                <DialogDescription>Completed Droplets: </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <div className="inline-flex items-center gap-2" onClick={handleRemove}>
            <Button size="sm" variant="outline">
              Remove Friend
            </Button>
          </div>
        </div>
      </li>
    );
  }
