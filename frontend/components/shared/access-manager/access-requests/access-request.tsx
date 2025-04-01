"use client";

import { createAuthorizedUser, deleteAccessRequest } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { AccessRequest } from "./access-requests";
import { useTransition } from "react";
import { Check, X } from "lucide-react";

export function AccessRequestBlock({ request }: { request: AccessRequest }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", request.email);
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(null, formData);

      if (result.ok) {
        const deleteFormData = new FormData();
        deleteFormData.append("id", request.id);
        await deleteAccessRequest(deleteFormData);
      }
    });
  };

  const handleDeleteRequest = async (formData: FormData) => {
    await deleteAccessRequest(formData);
  };

  return (
    <li className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium dark:text-slate-300">
          {request.givenName} {request.familyName}
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {request.email}
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {request.affiliation} • {request.college}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          className="bg-green-600 dark:bg-green-800 dark:hover:bg-green-900 text-white dark:text-white hover:bg-green-700 px-2 sm:px-4"
          disabled={isPending}
        >
          <Check />
          <p className="hidden sm:block">Accept</p>
        </Button>

        <form action={handleDeleteRequest}>
          <input type="hidden" name="id" value={request.id} />
          <Button
            variant="destructive"
            disabled={isPending}
            className="px-2 sm:px-4"
          >
            <p className="hidden sm:block">Reject</p>
            <X />
          </Button>
        </form>
      </div>
    </li>
  );
}
