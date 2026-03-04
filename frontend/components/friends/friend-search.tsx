"use client";

import { Input } from "@/components/ui/input";
import { useState, useEffect, ChangeEvent } from "react";
import { AuthorizedUser } from "@/types";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { FriendBlock } from "./friend-block";
import { cn } from "@/lib/utils";
import { searchAuthorizedUsers } from "@/lib/requests/authorized-user";

interface FriendSearchProps {
  curUser: AuthorizedUser;
  requestIds: number[];
  friendIds: number[];
}

export function FriendSearch({
  curUser,
  requestIds,
  friendIds,
}: FriendSearchProps) {
  const [searchTerm, setSearchItem] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [searchResults, setSearchResults] = useState<AuthorizedUser[]>([]);
  const [focused, setFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) {
        try {
          setIsLoading(true);
          const results = await searchAuthorizedUsers(searchTerm);
          if (Array.isArray(results)) {
            const filtered = results.filter(
              (user) =>
                user.id !== curUser.id &&
                !curUser.blocked.some(
                  (blockedUser) => blockedUser.id === user.id,
                ) &&
                !curUser.was_blocked.some(
                  (blockedUser) => blockedUser.id === user.id,
                ),
            );
            setSearchResults(filtered);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, curUser.blocked, curUser.was_blocked]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchItem(e.target.value);
  };

  return (
    <div className="relative mb-4 flex justify-center">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search..."
          className={cn(
            "flex w-[300px] items-center justify-center md:w-[500px]",
            focused
              ? "shadow-[0px_0px_16px_rgb(29,58,138)] dark:shadow-[0px_0px_16px_rgb(0,255,255)]"
              : "shadow-[0px_0px_8px_rgb(29,58,138)] dark:shadow-[0px_0px_6px_rgb(0,255,255)]",
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
            className="absolute left-1/2 z-50 w-screen -translate-x-1/2 transform rounded-md border border-gray-200 bg-white shadow-lg md:max-w-[600px] dark:border-slate-500 dark:bg-slate-800"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="p-4 md:space-y-4">
                {searchResults.slice(0, 10).map((user, index) => {
                  if (friendIds.includes(user.id)) {
                    return (
                      <FriendBlock
                        user={curUser}
                        friend={user}
                        key={user.id}
                        data-testid={`user-item-${index + 1}`}
                      />
                    );
                  } else if (!requestIds.includes(user.id)) {
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
              <p
                className="p-4 text-center text-sm text-gray-500"
                data-testid="no-results"
              >
                No users found.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
