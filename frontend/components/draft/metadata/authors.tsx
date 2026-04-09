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
    <section className="w-full">
      <div className="flex w-full items-center justify-between pt-4 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Author(s)
        </h2>
        <UserMultiSelect
          selectedIds={currentSelectedIds}
          onChange={handleSelectionChange}
        />
      </div>

      {selectedUsers.length > 0 && (
        <ul className="mb-4 flex flex-col gap-3">
          {selectedUsers.map((user) => (
            <li
              key={user.id}
              className="rounded-lg border border-[#D0D5DD] bg-white dark:border-slate-600 dark:bg-slate-900"
            >
              <AuthorCard
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
            </li>
          ))}
        </ul>
      )}

      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
