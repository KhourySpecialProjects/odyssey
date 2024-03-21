"use client";

import { AuthorizedUser } from "./authorized-users";
import { deleteAuthorizedUser, updateAuthorizedUser } from "@/lib/actions";
import { Button, Tooltip } from "@lemonsqueezy/wedges";
import { TrashIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AuthorizedUserBlock({ user }: { user: AuthorizedUser }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {user.email}
            {!user.isEnabled ? " (Disabled)" : ""}
          </p>
          <p className="text-sm truncate text-slate-500 dark:text-slate-400">
            {user.isAdmin ? "Admin" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <form action={updateAuthorizedUser}>
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
            <input
              id="isAdmin"
              name="isAdmin"
              type="text"
              defaultValue={String(user.isAdmin)}
              hidden
            />
            <SubmitButton destructive={user.isEnabled}>
              {user.isEnabled ? "Disable Access" : "Enable Access"}
            </SubmitButton>
          </form>

          <form action={updateAuthorizedUser}>
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
              defaultValue={String(user.isEnabled)}
              hidden
            />
            <input
              id="isAdmin"
              name="isAdmin"
              type="text"
              defaultValue={String(!user.isAdmin)}
              hidden
            />
            <SubmitButton destructive={user.isAdmin}>
              {user.isAdmin
                ? "Revoke Admin Permissions"
                : "Grant Admin Permissions"}
            </SubmitButton>
          </form>

          <form action={deleteAuthorizedUser}>
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
      destructive={destructive}
      variant={destructive ? "link" : "primary"}
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}

function SubmitDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Tooltip content="Delete user">
      <Button type="submit" size="sm" destructive aria-disabled={pending}>
        <TrashIcon className="w-4" />
      </Button>
    </Tooltip>
  );
}
