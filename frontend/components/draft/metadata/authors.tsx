"use client";

import { useState, useEffect } from "react";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import { AuthorizedUser } from "@/types";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { AuthorCard } from "@/components/droplets/author-block";

export function Authors({
  dropletId,
  selectedIds: initialSelectedIds,
}: {
  dropletId: number;
  selectedIds: number[];
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);
  const [currentSelectedIds, setCurrentSelectedIds] =
    useState<number[]>(initialSelectedIds);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await fetchAuthorizedUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const handleSelectionChange = (newSelectedIds: number[]) => {
    setCurrentSelectedIds(newSelectedIds);
    handleChange({ authorized_users: newSelectedIds });
  };

  const selectedUsers = users.filter((user) =>
    currentSelectedIds.includes(user.id),
  );

  return (
    <section className="w-full max-w-2xl">
      <h2 className="mt-4 pb-4 text-2xl font-bold text-slate-900 dark:text-white">
        Author(s)
      </h2>

      {selectedUsers.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {selectedUsers.map((user) => (
            <AuthorCard
              key={user.id}
              author={user}
              {...user}
              inDraft={true}
              onRemove={() => {
                const newSelectedIds = currentSelectedIds.filter(
                  (id) => id !== user.id,
                );
                handleSelectionChange(newSelectedIds);
              }}
            />
          ))}
        </ul>
      )}

      <UserMultiSelect
        selectedIds={currentSelectedIds}
        onChange={handleSelectionChange}
      />
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
