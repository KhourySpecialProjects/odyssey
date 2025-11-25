"use client";

import { deleteAccessRequest } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";
import { toast } from "sonner";
import { AlignCenter } from 'lucide-react';
import { CreationRequest } from "@/types";


export function CreationRequestBlock({ request }: { request: CreationRequest }) {
  const [isPending, startTransition] = useTransition();

  const handleDeleteRequest = async (formData: FormData) => {
    const result = await deleteAccessRequest(formData);
    if (result?.error) {
      toast.error("User could not be deleted!");
    } else {
      toast.success("User rejected!");
    }
  };

  return (
    <li className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium dark:text-slate-300">
          {request.user.firstName} {request.user.lastName}
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {request.user.email}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          className="bg-blue-600 px-2 hover:bg-blue-700 sm:px-4 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-900"
          disabled={isPending}
          role="button"
        >
          <AlignCenter className="text-black dark:text-white"/>
          <p className="hidden sm:block">View</p>
        </Button>

      </div>
    </li>
  );
}
