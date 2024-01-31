"use client";

import { AuthorizedUser } from "./authorized-users";
import { updateAuthorizedUser } from "@/lib/actions";
import { useFormStatus } from "react-dom";

export function AuthorizedUserBlock({ user }: { user: AuthorizedUser }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate dark:text-white">
            {user.email}
            {!user.isEnabled ? " (Disabled)" : ""}
          </p>
          <p className="text-sm text-gray-500 truncate dark:text-gray-400">
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
            <SubmitButton>
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
            <SubmitButton>
              {user.isAdmin
                ? "Revoke Admin Permissions"
                : "Grant Admin Permissions"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </li>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      aria-disabled={pending}
    >
      {children}
    </button>
  );
}
