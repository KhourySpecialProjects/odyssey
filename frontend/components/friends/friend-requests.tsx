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
  noProfile: boolean;
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
      <section className={`${noProfile ? "" : "md:mt-4"}`}>
        {noProfile ? (
          <div className="absolute -top-[40px] left-1/2 w-full -translate-x-1/2 transform">
            <h1 className="text-center text-xl font-bold">Friend Requests</h1>
          </div>
        ) : (
          <div>
            <h1 className="font-bold">Friend Requests</h1>
            <p>A list of your pending friend requests.</p>
            {noProfile && <Separator className="mt-2 dark:bg-slate-600" />}
          </div>
        )}

        <div
          className={`rounded-md p-1 ${noProfile ? "bg-slate-50" : "mt-4 bg-slate-100 md:p-4"} dark:bg-slate-800`}
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
            <p className="text-center">You have no friend requests</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`mr-4 w-22 px-4 py-2`}
            >
              <MoveLeft
                role="left"
                className={`${currentPage === 0 ? "stroke-slate-300" : ""}`}
              />
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className={`px-4 py-2`}
            >
              <MoveRight
                role="right"
                className={`${currentPage === totalPages - 1 ? "stroke-slate-300" : ""}`}
              />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
