"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckIcon, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id)),
    [users, selectedIds],
  );

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
          className={cn(
            "h-auto min-h-10 w-full justify-start rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          {selectedUsers.length > 0 ? (
            <div className="flex w-full flex-wrap items-center justify-start gap-1">
              {selectedUsers.map((user) => (
                <Badge
                  variant="outline"
                  key={user.id}
                  className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-normal text-slate-800"
                >
                  {getUserLabel(user)}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selectedIds.filter((id) => id !== user.id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(selectedIds.filter((id) => id !== user.id));
                      }
                    }}
                    className="ml-0.5 cursor-pointer rounded-full hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="font-normal text-[#121216] dark:text-slate-500">
              {placeholder}
            </p>
          )}
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
