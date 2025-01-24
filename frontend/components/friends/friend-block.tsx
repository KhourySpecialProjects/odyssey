"use client";

import { Button } from "@/components/ui/button";
import { removeFriend } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { startTransition } from "react";
import { toast } from "sonner";



export function FriendBlock({ user, friend }: { user: AuthorizedUser, friend: AuthorizedUser }) {

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
          <div className="inline-flex items-center gap-2">
            <Button  size="sm" variant="outline" >
              View Profile
            </Button>
          </div>
          <div className="inline-flex items-center gap-2" onClick={handleRemove}>
            <Button size="sm" variant="outline">
              Remove Friend
            </Button>
          </div>
        </div>
      </li>
    );
  }
