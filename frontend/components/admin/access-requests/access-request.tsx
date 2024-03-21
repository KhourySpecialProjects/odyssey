"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteAccessRequest } from "@/lib/actions";
import { TrashIcon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { AccessRequest } from "./access-requests";

export function AccessRequestBlock({ request }: { request: AccessRequest }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="truncate text-slate-900 dark:text-white">
            <span className="font-bold">
              {request.givenName} {request.familyName}
            </span>{" "}
            &middot; {request.college} {request.affiliation}
          </p>
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {request.email}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <form action={deleteAccessRequest}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={request.id}
              hidden
            />
            <SubmitDeleteButton />
          </form>
        </div>
      </div>
    </li>
  );
}

function SubmitDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          aria-disabled={pending}
        >
          <TrashIcon className="w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete access request</p>
      </TooltipContent>
    </Tooltip>
  );
}
