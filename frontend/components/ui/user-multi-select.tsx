"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckIcon, Plus, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AuthorizedUser } from "@/types";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { cn } from "@/lib/utils";

interface UserMultiSelectProps {
  selectedIds: number[];
  onChange: (value: number[]) => void;
  placeholder?: string;
}

export function UserMultiSelect({
  selectedIds,
  onChange,
}: UserMultiSelectProps) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await fetchAuthorizedUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id)),
    [users, selectedIds],
  );

  const getUserLabel = (user: AuthorizedUser) =>
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  return (
    <div className="space-y-2">
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
            >
              {getUserLabel(user)}
              <button
                type="button"
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== user.id))
                }
                className="ml-0.5 rounded-full p-0.5 hover:bg-sky-100 dark:hover:bg-sky-800"
                aria-label={`Remove ${getUserLabel(user)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Standalone picker button that opens a user search popover.
 * Intended to be placed in the header next to "Bulk Add".
 */
export function UserPickerButton({
  selectedIds,
  onChange,
  placeholder = "Add user",
}: UserMultiSelectProps) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await fetchAuthorizedUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const searchLower = search.toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .trim();
      const email = user.email.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [users, search]);

  const getUserLabel = (user: AuthorizedUser) =>
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          variant="outline"
          size="sm"
          aria-label={placeholder}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end" side="bottom">
        <Command>
          <CommandInput
            placeholder="Search users..."
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="max-h-[260px] overflow-y-auto">
              {filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={`${user.firstName ?? ""} ${user.lastName ?? ""} ${user.email}`.trim()}
                    onSelect={() => {
                      const newSelected = isSelected
                        ? selectedIds.filter((id) => id !== user.id)
                        : [...selectedIds, user.id];
                      onChange(newSelected);
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-sky-600",
                        isSelected
                          ? "bg-sky-600 text-white"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <span>{getUserLabel(user)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
