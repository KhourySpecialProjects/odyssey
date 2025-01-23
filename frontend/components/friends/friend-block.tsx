"use client";

import { Button } from "@/components/ui/button";
import { updateAuthorizedUser, updateUserInfo } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { Pencil } from "lucide-react";
import { useFormStatus } from "react-dom";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { useState } from "react";
import {
  DialogHeader,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";
import { type } from "os";

export function FriendBlock({ user }: { user: AuthorizedUser }) {
    return (
      <li className="py-0 [&:not(:first-child)]:pt-3">
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-slate-900 dark:text-white">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </p>
            {user.bio && (
              <p className="text-sm truncate text-slate-500 dark:text-slate-400">
                {user.bio}
              </p>
            )}
          </div>
  
          <div className="inline-flex items-center gap-2">
            <Button size="sm" variant="outline">
              Remove Friend
            </Button>
          </div>
        </div>
      </li>
    );
  }

function SubmitButton({
  destructive,
  children,
}: {
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={destructive ? "destructive" : "link"}
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
