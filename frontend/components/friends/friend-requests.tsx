"use client";

import { FriendRequestBlock } from "./friend-request-block";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";
import { useState } from "react";
import { AuthorizedUser } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { IconUserPlus } from "@tabler/icons-react";

export function FriendRequests({
  noProfile,
  friendsPerPage,
  authUser,
  showTitle = true,
}: {
  noProfile: boolean;
  friendsPerPage: number;
  authUser: AuthorizedUser;
  showTitle?: boolean;
}) {
  const friendRequests = authUser.received_requests
    .filter(
      (friend) =>
        !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
        !authUser.was_blocked.some(
          (blockedUser) => blockedUser.id === friend.id,
        ),
    )
    .sort((a, b) => a.lastName?.localeCompare(b.lastName));

  const [currentPage, setCurrentPage] = useState(0);
  const requestsPerPage = friendsPerPage;

  const startIndex = currentPage * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const paginatedRequests = friendRequests.slice(startIndex, endIndex);

  const totalPages = Math.ceil((friendRequests.length || 0) / requestsPerPage);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex h-full flex-col">
      <section className="flex h-full flex-col">
        {showTitle && noProfile && (
          <div className="absolute -top-[40px] left-1/2 w-full -translate-x-1/2 transform">
            <h1 className="text-center text-xl font-bold">Friend Requests</h1>
          </div>
        )}

        <div
          className={`min-h-0 flex-1 overflow-y-auto rounded-md ${noProfile ? "p-1" : ""}`}
        >
          {friendRequests.length > 0 ? (
            <ul className="grid auto-cols-auto grid-cols-1 space-y-2 divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
              {noProfile
                ? paginatedRequests.map((friendship) => (
                    <FriendRequestFeedBlock
                      user={authUser}
                      request={friendship}
                      key={friendship.id}
                    />
                  ))
                : paginatedRequests.map((friendship) => (
                    <FriendRequestBlock
                      user={authUser}
                      request={friendship}
                      key={friendship.id}
                    />
                  ))}
            </ul>
          ) : (
            <EmptyState
              icon={
                <IconUserPlus
                  className="h-7 w-7 text-[#475569] dark:text-slate-400"
                  stroke={1.5}
                />
              }
              title="No friend requests"
              message="You don't have any pending friend requests."
            />
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="text-sm font-medium text-[#344054] disabled:opacity-40 dark:text-slate-300"
            >
              ‹ Prev
            </button>
            <span className="text-sm text-[#667085] dark:text-slate-400">
              {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="text-sm font-medium text-[#2D7597] disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
