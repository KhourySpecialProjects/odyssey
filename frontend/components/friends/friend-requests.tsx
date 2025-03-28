"use client";

import { FriendRequestBlock } from "./friend-request-block";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";
import { MoveLeft, MoveRight } from "lucide-react";
import { useState } from "react";
import { AuthorizedUser } from "@/types";
import { Separator } from "../ui/separator";

export function FriendRequests({
  noProfile,
  friendsPerPage,
  authUser,
}: {
  noProfile: Boolean;
  friendsPerPage: number;
  authUser: AuthorizedUser;
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
    <div className={`flex flex-col`}>
      <section className="mt-4">
        <h1 className="font-bold">Friend Requests</h1>
        <p>A list of your pending friend requests.</p>

        <Separator className="mt-2 dark:bg-slate-600" />

        <div className="p-1 lg:p-4 rounded-md bg-slate-50 dark:bg-slate-800">
          {friendRequests.length > 0 ? (
            <ul className="grid grid-cols-1 auto-cols-auto divide-y divide-slate-200 dark:divide-slate-700 space-y-2 md:space-y-4">
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
            <p>You have no friend requests</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`px-4 py-2 mr-4 w-22`}
            >
              <MoveLeft />
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className={`px-4 py-2`}
            >
              <MoveRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
