"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthorizedUser } from "@/types";
import { fetchAllContentCreators } from "@/lib/requests/users";

interface UserMultiSelectProps {
  selectedIds: number[];
  onChange: (value: number[]) => void;
}

/**
 * Renders a multi-select dropdown for choosing users, supporting search and selection by name or email.
 *
 * Displays a searchable list of users fetched from the content creators API. Selected users are shown in the trigger button, and changes are communicated via the `onChange` callback.
 *
 * @param selectedIds - Array of user IDs currently selected
 * @param onChange - Callback invoked with the updated array of selected user IDs when the selection changes
 */
export function UserMultiSelect({
  selectedIds,
  onChange,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await fetchAllContentCreators();
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between dark:hover:bg-slate-900"
        >
          {selectedIds.length > 0
            ? users
                .filter((user) => selectedIds.includes(user.id))
                .map((user) =>
                  user.firstName && user.lastName
                    ? user.firstName + " " + user.lastName
                    : user.email,
                )
                .join(", ")
            : "Select users..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Search users..."
            onValueChange={setSearch}
          />
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup className="max-h-[260px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.firstName} ${user.lastName} ${user.email}`}
                onSelect={() => {
                  const newSelected = selectedIds.includes(user.id)
                    ? selectedIds.filter((id) => id !== user.id)
                    : [...selectedIds, user.id];
                  onChange(newSelected);
                }}
              >
                <Checkbox
                  checked={selectedIds.includes(user.id)}
                  className="mr-2"
                />
                <div>
                  <div className="text-muted-foreground text-sm">
                    {user.firstName && user.lastName
                      ? user.firstName + " " + user.lastName
                      : user.email}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
