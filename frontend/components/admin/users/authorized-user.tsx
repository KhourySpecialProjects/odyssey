"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteAuthorizedUser, updateAuthorizedUser } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { TrashIcon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { isAuthorizedUserAdmin } from "@/lib/utils";

export function AuthorizedUserBlock({ user }: { user: AuthorizedUser }) {
  const isAdmin = isAuthorizedUserAdmin(user.roles.map((role) => role.title));

  const handleUpdateUser = async (formData: FormData) => {
    await updateAuthorizedUser(formData);
  };

  const handleDeleteUser = async (formData: FormData) => {
    await deleteAuthorizedUser(formData);
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {user.email}
            {!user.isEnabled ? " (Disabled)" : ""}
          </p>
          <p className="text-sm truncate text-slate-500 dark:text-slate-400">
            {isAdmin ? "Admin" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <form action={handleUpdateUser}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={user.id}
              hidden
            />
            <input
              id="isEnabled"
              name="isEnabled"
              type="text"
              defaultValue={String(!user.isEnabled)}
              hidden
            />
            <SubmitButton destructive={user.isEnabled}>
              {user.isEnabled ? "Disable Access" : "Enable Access"}
            </SubmitButton>
          </form>

          <form action={handleDeleteUser}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={user.id}
              hidden
            />
            <SubmitDeleteButton />
          </form>
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
        <p>Delete user</p>
      </TooltipContent>
    </Tooltip>
  );
}
