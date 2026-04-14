"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { AuthorizedUser } from "@/types";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { FriendBlock } from "./friend-block";
import { SearchBar } from "@/components/admin/search-bar";
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) {
        try {
          setIsLoading(true);
          const results = await searchAuthorizedUsers(searchTerm);
          if (cancelled) return;
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
          if (cancelled) return;
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, curUser.blocked, curUser.was_blocked]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchItem(e.target.value);
  };

  return (
    <div
      className="relative mb-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SearchBar
        value={searchTerm}
        onChange={handleInputChange}
        placeholder="Search..."
      />

      {isHovered && searchTerm != "" && (
        <div className="absolute left-0 z-50 mt-1 w-full rounded-md border border-[#D0D5DD] bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-[#667085]">
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
              className="p-4 text-center text-sm text-[#667085]"
              data-testid="no-results"
            >
              No users found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
