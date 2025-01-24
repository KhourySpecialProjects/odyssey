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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { removeFriend, sendFriendRequest, getSentRequest } from "@/lib/requests/friends";


export function FriendSuggestionsBlock({ suggUser, curUser }: { curUser: AuthorizedUser, suggUser: AuthorizedUser }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(suggUser.firstName || "");
  const [lastName, setLastName] = useState(suggUser.lastName || "");
  const [bio, setBio] = useState(suggUser.bio || "");
  const[requestSent, setRequestSent] = useState(false);

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

  let hasSent: Boolean = false;

  useEffect(() => {
    const handleSentRequest = async () => {
    hasSent = await getSentRequest(curUser, suggUser);
    }
    handleSentRequest();
  }, [suggUser])
  

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {suggUser.email}
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={hasSent === false} onClick={handleRequest} className="text-white bg-sky-600">
            {hasSent ? "Send Request" : "Sent!"}
            </Button>
          </div>
      </div>
    </li>
  );
}

