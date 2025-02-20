"use client";

import { FriendRequestBlock } from "./friend-request-block";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";
import { MoveLeft, MoveRight } from "lucide-react";
import { useState } from "react";
import { AuthorizedUser } from "@/types";

export function FriendRequests({
  noProfile,
  friendsPerPage,
  authUser,
}: {
  noProfile: Boolean;
  friendsPerPage: number;
  authUser: AuthorizedUser;
}) {
  const friendRequests = authUser.received_requests.filter(
    (friend) =>
      !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
      !authUser.was_blocked.some((blockedUser) => blockedUser.id === friend.id),
  );

  const [currentPage, setCurrentPage] = useState(0); // Track the current page
  const requestsPerPage = friendsPerPage; // Number of lessons to show per page

  // Calculate the start and end indices for the lessons on the current page
  const startIndex = currentPage * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const paginatedRequests = friendRequests.slice(startIndex, endIndex); // Slice the lessons array

  // Calculate the total number of pages
  const totalPages = Math.ceil((friendRequests.length || 0) / requestsPerPage);

  // Handlers for navigation
  const handleNextPage = () => {
    //if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    //if (currentPage > 0) setCurrentPage(currentPage - 1);
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex flex-col ">
      <section>
        <h1 className="font-bold">Friend Requests</h1>
        <p>A list of your friend requests.</p>

        <div className="p-4 mt-4 rounded-md bg-slate-100">
          {friendRequests.length > 0 ? (
            <ul className="grid grid-cols-1 auto-cols-auto divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
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
