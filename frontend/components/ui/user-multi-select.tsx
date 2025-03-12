"use client";

import { useState, useEffect } from "react";
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
import { fetchAllUsers } from "@/lib/requests/users";

interface UserMultiSelectProps {
  selectedIds: number[];
  onChange: (value: number[]) => void;
}

export function UserMultiSelect({
  selectedIds,
  onChange,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

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
                .map((user) => user.firstName + " " + user.lastName)
                .join(", ")
            : "Select users..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup>
            {users.map((user) => (
              <CommandItem
                key={user.id}
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
                  {/* <div>{user.name}</div> */}
                  <div className="text-sm text-muted-foreground">
                    {user.firstName + " " + user.lastName}
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
