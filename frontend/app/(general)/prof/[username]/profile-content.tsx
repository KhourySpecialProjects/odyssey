"use client";

import React, { useState } from "react";
import { AuthorizedUser, Enrollment } from "@/types";
import DOMPurify from "dompurify";
import {
  Star,
  Check,
  UserPlus,
  Clock,
  X,
  LinkIcon,
  LinkedinIcon,
  GithubIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { sendFriendRequest, cancelFriendRequest } from "@/lib/requests/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDroplet, IconUsers } from "@tabler/icons-react";

interface ProfileContentProps {
  userData: AuthorizedUser;
  enrollments: Enrollment[];
  friends: AuthorizedUser[];
  announcements?: unknown[];
  currentUserCompletedIds: number[];
  isViewingOwnProfile: boolean;
  currentUser: AuthorizedUser | null;
}

export function ProfileContent({
  userData,
  enrollments,
  friends,
  currentUserCompletedIds,
  isViewingOwnProfile,
  currentUser,
}: ProfileContentProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingFriendId, setAddingFriendId] = useState<number | null>(null);
  const [cancellingFriendId, setCancellingFriendId] = useState<number | null>(
    null,
  );
  const [pendingRequests, setPendingRequests] = useState<Set<number>>(
    new Set(),
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "completed";

  const createdDroplets = (userData.droplets || []).map((droplet, index) => ({
    ...droplet,
    uniqueKey: `created-${droplet.id}-${index}`,
  }));

  const completedDroplets = (enrollments || [])
    .filter((e) => e.isComplete && e.droplet)
    .map((e, index) => ({
      ...e.droplet!,
      uniqueKey: `completed-${e.droplet!.id}-${index}`,
    }));

  const totalEnrollments = enrollments?.length || 0;
  const completedCount = completedDroplets.length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedCount / totalEnrollments) * 100)
      : 0;

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const isCompletedByViewer = (dropletId: number) => {
    return currentUserCompletedIds.includes(dropletId);
  };

  const isAlreadyFriends = (userId: number): boolean => {
    if (!currentUser?.friendships) return false;
    return currentUser.friendships.some((friendship) => {
      const userIds = friendship.authorized_users.map((user) => user.id);
      return userIds.includes(userId);
    });
  };

  const hasPendingRequest = (userId: number): boolean => {
    if (!currentUser?.sent_requests) return false;
    return currentUser.sent_requests.some((request) => request.id === userId);
  };

  const handleAddFriend = async (friend: AuthorizedUser) => {
    if (!currentUser) return;
    setAddingFriendId(friend.id);
    try {
      await sendFriendRequest(currentUser, friend);
      setPendingRequests((prev) => new Set(prev).add(friend.id));
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setAddingFriendId(null);
    }
  };

  const handleCancelFriendRequest = async (friend: AuthorizedUser) => {
    if (!currentUser) return;
    setCancellingFriendId(friend.id);
    try {
      await cancelFriendRequest(currentUser.id, friend.id);
      setPendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(friend.id);
        return newSet;
      });
    } catch (error) {
      console.error("Error cancelling friend request:", error);
    } finally {
      setCancellingFriendId(null);
    }
  };

  const tabs = [
    { id: "completed", label: "Completed", count: completedDroplets.length },
    ...(createdDroplets.length > 0
      ? [{ id: "created", label: "Created", count: createdDroplets.length }]
      : []),
    { id: "friends", label: "Friends", count: friends.length },
  ];

  const fullName = `${userData.firstName} ${userData.lastName}`;

  return (
    <div className="bg-white px-4 py-8 md:px-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* PROFILE HEADER */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-6">
            <Avatar variant="round" size="xl">
              <AvatarImage src={userData.profilePhoto || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-2xl text-black dark:text-white">{fullName}</p>
              <p className="text-lg text-[#475569] dark:text-slate-400">
                {userData.email}
              </p>

              {/* Bio */}
              {userData.bio && (
                <p className="mt-3 max-w-2xl text-base text-[#475569] dark:text-slate-400">
                  {userData.bio}
                </p>
              )}

              {/* Social links */}
              <div className="mt-3 flex gap-3">
                {userData.linkedin && (
                  <Link
                    href={
                      userData.linkedin.startsWith("http")
                        ? userData.linkedin
                        : `https://${userData.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#667085] transition-colors hover:text-[#287697] dark:text-slate-400"
                  >
                    <LinkedinIcon className="h-5 w-5" />
                  </Link>
                )}
                {userData.github && (
                  <Link
                    href={
                      userData.github.startsWith("http")
                        ? userData.github
                        : `https://${userData.github}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#667085] transition-colors hover:text-[#287697] dark:text-slate-400"
                  >
                    <GithubIcon className="h-5 w-5" />
                  </Link>
                )}
                {userData.website && (
                  <Link
                    href={
                      userData.website.startsWith("http")
                        ? userData.website
                        : `https://${userData.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#667085] transition-colors hover:text-[#287697] dark:text-slate-400"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats box */}
          <div className="flex gap-8 rounded-xl border border-[#D0D5DD] px-8 py-4 dark:border-slate-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-black dark:text-white">
                {totalEnrollments}
              </p>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                Enrollments
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black dark:text-white">
                {completionRate}%
              </p>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                Completion
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black dark:text-white">
                {createdDroplets.length}
              </p>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                Created
              </p>
            </div>
          </div>
        </div>

        {/* PILL TABS */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[#287697] bg-[#287697] text-white"
                  : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div>
          {/* DROPLETS COMPLETED */}
          {activeTab === "completed" &&
            (completedDroplets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {completedDroplets.map((droplet) => (
                  <button
                    key={droplet.uniqueKey}
                    onClick={() => setSelectedId(droplet.id)}
                    className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-[#D0D5DD] bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    <h3 className="mb-2 text-center font-semibold text-black dark:text-white">
                      {droplet.name}
                    </h3>
                    {droplet.averageRating !== undefined &&
                      droplet.averageRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                          <span className="text-sm text-[#667085]">
                            {droplet.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={
                  <IconDroplet
                    className="h-7 w-7 text-[#475569] dark:text-slate-400"
                    stroke={1.5}
                  />
                }
                title="No completed droplets"
                message="Droplets completed by this user will appear here."
              />
            ))}

          {/* DROPLETS CREATED */}
          {activeTab === "created" && createdDroplets.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {createdDroplets.map((droplet) => (
                <button
                  key={droplet.uniqueKey}
                  onClick={() => setSelectedId(droplet.id)}
                  className="relative flex min-h-32 flex-col items-center justify-center rounded-xl border border-[#D0D5DD] bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  {!isViewingOwnProfile && isCompletedByViewer(droplet.id) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                      <Check className="h-3 w-3" />
                      Completed
                    </div>
                  )}
                  <h3 className="mb-2 text-center font-semibold text-black dark:text-white">
                    {droplet.name}
                  </h3>
                  {droplet.averageRating !== undefined &&
                    droplet.averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                        <span className="text-sm text-[#667085]">
                          {droplet.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                </button>
              ))}
            </div>
          )}

          {/* FRIENDS TAB */}
          {activeTab === "friends" &&
            (friends.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {friends.map((friend) => {
                  const alreadyFriends = isAlreadyFriends(friend.id);
                  const isPending =
                    hasPendingRequest(friend.id) ||
                    pendingRequests.has(friend.id);
                  const showAddButton =
                    !isViewingOwnProfile &&
                    currentUser &&
                    !alreadyFriends &&
                    !isPending &&
                    friend.id !== currentUser.id;

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#D0D5DD] p-4 dark:border-slate-700"
                    >
                      <Link
                        href={`/prof/${friend.email.replace("@northeastern.edu", "")}`}
                        className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80"
                      >
                        <Avatar variant="round" size="sm">
                          <AvatarImage src={friend.profilePhoto || undefined} />
                          <AvatarFallback>
                            {getInitials(
                              `${friend.firstName} ${friend.lastName}`,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium text-black dark:text-white">
                          {friend.firstName} {friend.lastName}
                        </p>
                      </Link>

                      {showAddButton && (
                        <button
                          onClick={() => handleAddFriend(friend)}
                          disabled={addingFriendId === friend.id}
                          className="flex items-center gap-1 rounded-md bg-[#287697] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1f6080] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingFriendId === friend.id ? (
                            <span>Adding...</span>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}

                      {isPending &&
                        !isViewingOwnProfile &&
                        currentUser &&
                        friend.id !== currentUser.id && (
                          <button
                            onClick={() => handleCancelFriendRequest(friend)}
                            disabled={cancellingFriendId === friend.id}
                            className="group/cancel flex items-center gap-1 rounded-md border border-[#D0D5DD] px-3 py-1.5 text-sm font-medium text-[#667085] transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
                          >
                            {cancellingFriendId === friend.id ? (
                              <span>Cancelling...</span>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 group-hover/cancel:hidden" />
                                <X className="hidden h-4 w-4 group-hover/cancel:block" />
                                <span>Pending</span>
                              </>
                            )}
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={
                  <IconUsers
                    className="h-7 w-7 text-[#475569] dark:text-slate-400"
                    stroke={1.5}
                  />
                }
                title="No friends yet"
                message="This user hasn't added any friends."
              />
            ))}
        </div>

        {/* DROPLET MODAL */}
        {selectedId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 dark:bg-black/40"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-xl font-bold text-black dark:text-white">
                  {completedDroplets.find((d) => d.id === selectedId)?.name ||
                    createdDroplets.find((d) => d.id === selectedId)?.name}
                </h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-[#667085] hover:text-black dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {(() => {
                const droplet =
                  completedDroplets.find((d) => d.id === selectedId) ||
                  createdDroplets.find((d) => d.id === selectedId);
                return droplet?.averageRating !== undefined &&
                  droplet.averageRating > 0 ? (
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, index) => {
                        const ratingValue = index + 1;
                        const fillPercentage =
                          ratingValue <= Math.floor(droplet.averageRating!)
                            ? 100
                            : ratingValue > Math.ceil(droplet.averageRating!)
                              ? 0
                              : (droplet.averageRating! % 1) * 100;
                        return (
                          <Star
                            key={index}
                            className="h-5 w-5"
                            fill={fillPercentage > 50 ? "#ffc107" : "#e4e5e9"}
                            stroke={fillPercentage > 50 ? "#ffc107" : "#e4e5e9"}
                          />
                        );
                      })}
                    </div>
                    <span className="text-sm font-medium text-[#667085]">
                      {droplet.averageRating.toFixed(1)}
                    </span>
                  </div>
                ) : null;
              })()}

              <div
                className="mb-4 text-sm text-[#475569] dark:text-slate-300"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    completedDroplets.find((d) => d.id === selectedId)
                      ?.description ||
                      createdDroplets.find((d) => d.id === selectedId)
                        ?.description ||
                      "",
                  ),
                }}
              />

              <Link
                href={`/d/${
                  completedDroplets.find((d) => d.id === selectedId)?.slug ||
                  createdDroplets.find((d) => d.id === selectedId)?.slug
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-md bg-[#287697] px-4 py-2 font-medium text-white transition-colors hover:bg-[#1f6080]"
              >
                View Droplet
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
