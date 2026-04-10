"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckIcon, Plus } from "lucide-react";
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
  placeholder = "Select users...",
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
          className="h-9 w-9 border-none bg-transparent p-0 text-[#344054] shadow-none transition-colors hover:bg-transparent hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100"
          aria-label={placeholder}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
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
                    value={`${user.firstName} ${user.lastName} ${user.email}`}
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
