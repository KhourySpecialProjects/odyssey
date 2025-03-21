"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ChangeEvent } from "react";
import { AuthorizedUser } from "@/types";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { FriendBlock } from "./friend-block";
import { cn } from "@/lib/utils";

interface FriendSearchProps {
  authUsers: AuthorizedUser[];
  curUser: AuthorizedUser;
  requestIds: number[];
  friendIds: number[];
}

export function FriendSearch({
  authUsers,
  curUser,
  requestIds,
  friendIds,
}: FriendSearchProps) {
  const [searchTerm, setSearchItem] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [searchResults, setSearchResults] = useState<AuthorizedUser[]>([]);
  const [focused, setFocused] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setSearchItem(searchTerm);

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = authUsers.filter(
      (user) =>
        !curUser.blocked.some((blockedUser) => blockedUser.id === user.id) &&
        !curUser.was_blocked.some(
          (blockedUser) => blockedUser.id === user.id,
        ) &&
        (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email
            ?.split("@")[0]
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (
            user.firstName?.toLowerCase() +
            " " +
            user.lastName?.toLowerCase()
          ).includes(searchTerm.toLowerCase())),
    );

    if (filtered?.length === 0) {
      setSearchResults([]);
    } else {
      setSearchResults(filtered);
    }
  };

  return (
    <div className="relative flex justify-center mb-4">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search..."
          className={cn(
            "w-[250px] md:w-[500px] flex items-center justify-center",
            focused
              ? "dark:shadow-[0px_0px_16px_rgb(0,255,255)] shadow-[0px_0px_16px_rgb(29,58,138)]"
              : "dark:shadow-[0px_0px_6px_rgb(0,255,255)] shadow-[0px_0px_8px_rgb(29,58,138)]",
          )}
          value={searchTerm}
          onChange={(e) => handleInputChange(e)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {isHovered && searchTerm != "" && (
          <div
            className="absolute z-50 w-screen left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-500 rounded-md shadow-lg md:max-w-[600px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {searchResults.length > 0 ? (
              <ul className="md:space-y-4 p-4">
                {searchResults.slice(0, 10).map((user, index) => {
                  if (!friendIds.includes(user.id)) {
                    return (
                      <FriendBlock user={curUser} friend={user} key={user.id} data-testid={`user-item-${index + 1}`}/>
                    );
                  } else if (requestIds.includes(user.id)) {
                    return (
                      <FriendSuggestionsBlock
                        suggUser={user}
                        curUser={curUser}
                        display={true}
                        requested={false}
                        key={user.id}
                        data-testid={`user-item-${user.id}`}
                      />
                    );
                  } else {
                    return (
                      <FriendSuggestionsBlock
                        suggUser={user}
                        curUser={curUser}
                        display={true}
                        requested={true}
                        key={user.id}
                        data-testid={`user-item-${user.id}`}
                      />
                    );
                  }
                })}
              </ul>
            ) : (
              <p className="p-1" data-testid="no-results">No users found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
