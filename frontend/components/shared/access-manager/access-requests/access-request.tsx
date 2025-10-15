"use client";

import { deleteAccessRequest } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { AccessRequest } from "./access-requests";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";
import { toast } from "sonner";

export function AccessRequestBlock({ request }: { request: AccessRequest }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", request.email);
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      if (result.ok) {
        toast.success("User is now authorized!");
        const deleteFormData = new FormData();
        deleteFormData.append("id", request.id);
        await deleteAccessRequest(deleteFormData);
      } else if (result["error"] === "This attribute must be unique") {
        toast.error("This user is already authorized!");
      }
    });
  };

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
          className="bg-green-600 px-2 text-white hover:bg-green-700 sm:px-4 dark:bg-green-800 dark:text-white dark:hover:bg-green-900"
          disabled={isPending}
          role="button"
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
