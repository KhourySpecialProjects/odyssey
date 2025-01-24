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

export function FriendSuggestionsBlock({ user }: { user: AuthorizedUser }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {user.email}
          </p>
        </div>
      </div>
    </li>
  );
}

