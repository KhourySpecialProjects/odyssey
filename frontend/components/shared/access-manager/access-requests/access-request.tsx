"use client";

import { createAuthorizedUser, deleteAccessRequest } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { AccessRequest } from "./access-requests";
import { useTransition } from "react";

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

  return (
    <li className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium">
          {request.givenName} {request.familyName}
        </p>
        <p className="text-sm text-gray-600">{request.email}</p>
        <p className="text-sm text-gray-600">
          {request.affiliation} • {request.college}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          className="bg-green-600 text-white hover:bg-green-700"
          disabled={isPending}
        >
          Accept
        </Button>

        <form action={deleteAccessRequest}>
          <input type="hidden" name="id" value={request.id} />
          <Button variant="destructive" disabled={isPending}>
            Reject
          </Button>
        </form>
      </div>
    </li>
  );
}
