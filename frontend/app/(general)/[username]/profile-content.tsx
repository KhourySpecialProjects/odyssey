"use client";

import React, { use, useState } from "react";
import { Tabs, Tab, Box, Avatar } from "@mui/material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import IconButton from "@mui/material/IconButton";
import { AuthorizedUser, Enrollment, Announcement } from "@/types";
import DOMPurify from "dompurify";
import {
  Droplet as DropletIcon,
  Handshake,
  PartyPopper,
  PlusCircle,
  Star,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface ProfileContentProps {
  userData: AuthorizedUser;
  enrollments: Enrollment[];
  friends: AuthorizedUser[];
  announcements: Announcement[];
  currentUserCompletedIds: number[]; // Droplet IDs the current viewer has completed
  isViewingOwnProfile: boolean; // True if viewing your own profile
}

/**
 * ProfileContent - Client Component
 *
 * Handles all interactive UI for the public profile page including:
 * - Tabbed interface with state management
 * - Droplet modals with ratings and navigation
 * - Completion badges on created droplets (when viewing others' profiles)
 * - Hover effects and animations
 */
export function ProfileContent({
  userData,
  enrollments,
  friends,
  announcements,
  currentUserCompletedIds,
  isViewingOwnProfile,
}: ProfileContentProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // initiate an activeTab from URL param, default to 0
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return tabParam ? parseInt(tabParam) : 0;
  });

  // Process droplets data
  const createdDroplets = (userData.droplets || []).map((droplet, index) => ({
    ...droplet,
    uniqueKey: `created-${droplet.id}-${index}`,
  }));

  const completedDroplets = (enrollments || [])
    .filter((e) => e.isComplete && e.droplet) // Check droplet exists
    .map((e, index) => ({
      ...e.droplet!,
      uniqueKey: `completed-${e.droplet!.id}-${index}`,
    }));

  // Calculate statistics
  const totalEnrollments = enrollments?.length || 0;
  const completedCount = completedDroplets.length;
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedCount / totalEnrollments) * 100)
      : 0;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Update the URL with the new tab parameter without refreshing the page
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newValue.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  function formatDate(dateInput: string | Date | undefined) {
    if (!dateInput) return "";
    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }

  /**
   * Check if the current viewer has completed a specific user droplet
   * Only relevant when viewing someone else's created droplets
   */
  const isCompletedByViewer = (dropletId: number) => {
    return currentUserCompletedIds.includes(dropletId);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl">
        {/* ===== PROFILE HEADER SECTION ===== */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left side: Profile Picture and Name */}
            <div className="flex items-center justify-center gap-6 lg:justify-start">
              <Avatar
                src={userData.profilePhoto || undefined}
                alt={`${userData.firstName} ${userData.lastName}`}
                sx={{ width: 140, height: 140 }}
                className="border-4 border-gray-300 dark:border-gray-600"
              />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userData.firstName}
                </h1>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userData.lastName}
                </h1>
              </div>
            </div>

            {/* Right side: Statistics Panel with Hover Tooltips */}
            <div className="flex flex-row gap-6 rounded-lg border-2 border-gray-200 bg-gray-50 px-8 py-4 lg:min-w-[280px] dark:border-gray-700 dark:bg-gray-900">
              <div className="group relative text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalEnrollments}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Enrollments
                </p>
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                  Total droplets enrolled in
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-700"></div>
                </div>
              </div>
              <div className="group relative text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completionRate}%
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Completion
                </p>
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                  Percentage of droplets completed
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-700"></div>
                </div>
              </div>
              <div className="group relative text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {createdDroplets.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Created
                </p>
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                  Droplets authored by this user
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio and Social Links */}
          <div className="mt-4 flex flex-col items-center">
            {userData.bio && (
              <div
                className="mb-3 max-w-2xl text-center text-lg text-gray-600 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(userData.bio),
                }}
              />
            )}

            <div className="flex gap-3">
              {userData.linkedin && (
                <IconButton
                  component="a"
                  href={
                    userData.linkedin.startsWith("http")
                      ? userData.linkedin
                      : `https://${userData.linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  sx={{ color: "#0077b5", fontSize: 40 }}
                >
                  <LinkedInIcon fontSize="large" />
                </IconButton>
              )}
              {userData.github && (
                <IconButton
                  component="a"
                  href={
                    userData.github.startsWith("http")
                      ? userData.github
                      : `https://${userData.github}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  sx={{ color: "#333", fontSize: 40 }}
                  className="dark:!text-white"
                >
                  <GitHubIcon fontSize="large" />
                </IconButton>
              )}
            </div>
          </div>
        </div>

        {/* ===== TABS SECTION ===== */}
        <Box className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800 dark:text-gray-300">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            className="border-b border-gray-200 dark:border-gray-700"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontFamily: "inherit",
                fontSize: "1rem",
                fontWeight: 500,
                color: "#6b7280", // Gray in light mode
                "&.Mui-selected": {
                  color: "#2563eb", // Blue when selected (light mode)
                },
              },
              // Dark mode overrides
              ".dark &": {
                "& .MuiTab-root": {
                  color: "#d1d5db", // Light gray (unselected) in dark mode
                  "&.Mui-selected": {
                    color: "#ffffff", // White when selected in dark mode
                  },
                },
              },
            }}
          >
            <Tab label="Droplets Completed" />
            {createdDroplets.length > 0 && <Tab label="Droplets Created" />}
            <Tab label="Friends" />
          </Tabs>
        </Box>

        {/* ===== TAB CONTENT ===== */}
        <div>
          {/* DROPLETS COMPLETED TAB */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {completedDroplets.map((droplet) => (
                <div
                  key={droplet.id}
                  onClick={() => setSelectedId(droplet.id)}
                  className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-gray-300 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-600 dark:bg-gray-800"
                  style={{ transform: "translateY(0)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <h3 className="mb-2 text-center font-semibold text-gray-900 dark:text-white">
                    {droplet.name}
                  </h3>
                  {droplet.averageRating !== undefined &&
                    droplet.averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {droplet.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                </div>
              ))}
              {completedDroplets.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No completed droplets yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DROPLETS CREATED TAB */}
          {createdDroplets.length > 0 &&
            activeTab === (createdDroplets.length > 0 ? 1 : 0) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {createdDroplets.map((droplet) => (
                  <div
                    key={droplet.uniqueKey}
                    onClick={() => setSelectedId(droplet.id)}
                    className="relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-gray-300 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-600 dark:bg-gray-800"
                    style={{ transform: "translateY(0)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Completion Badge - Only show if viewer completed this droplet and not viewing own profile */}
                    {!isViewingOwnProfile &&
                      isCompletedByViewer(droplet.id) && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                          <Check className="h-3 w-3" />
                          Completed
                        </div>
                      )}

                    <h3 className="mb-2 text-center font-semibold text-gray-900 dark:text-white">
                      {droplet.name}
                    </h3>
                    {droplet.averageRating !== undefined &&
                      droplet.averageRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {droplet.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}

          {/* FRIENDS TAB */}
          {activeTab === (createdDroplets.length > 0 ? 2 : 1) && (
            <div className="space-y-2">
              {friends.map((friend) => (
                <a
                  key={friend.id}
                  href={`/profile/${friend.email.replace("@northeastern.edu", "")}`}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <Avatar
                    src={friend.profilePhoto || undefined}
                    alt={`${friend.firstName} ${friend.lastName}`}
                    sx={{ width: 48, height: 48 }}
                  />
                  <p className="font-medium text-gray-900 dark:text-white">
                    {friend.firstName} {friend.lastName}
                  </p>
                </a>
              ))}
              {friends.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No friends yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== RECENT ACTIVITY SECTION ===== */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          {announcements.length > 0 ? (
            <ul className="space-y-3">
              {announcements.map((announcement) => {
                const announcementType = announcement.type;
                const backgroundColor = {
                  friend: "bg-yellow-200 dark:bg-[#C38508]",
                  kudos: "bg-orange-200 dark:bg-[#B55E0C]",
                  droplet: "bg-blue-200 dark:bg-[#266697]",
                };
                const announcementIcon = {
                  friend: <Handshake className="h-5 w-5" />,
                  kudos: <PartyPopper className="h-5 w-5" />,
                  droplet: <PlusCircle className="h-5 w-5" />,
                };

                return (
                  <li
                    key={announcement.id}
                    className={`${backgroundColor[announcementType as keyof typeof backgroundColor] || "bg-gray-200 dark:bg-gray-700"} relative flex flex-col items-start gap-2 rounded-lg p-4`}
                  >
                    <div className="flex w-full flex-col justify-between gap-1">
                      <div className="flex items-center space-x-4">
                        <div className="text-slate-900 dark:text-slate-200">
                          {announcementIcon[
                            announcementType as keyof typeof announcementIcon
                          ] || <DropletIcon className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex w-full flex-row items-center justify-end text-xs text-slate-700 dark:text-slate-300"
                        suppressHydrationWarning
                      >
                        {formatDate(announcement.firstCreated)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No recent activity
            </p>
          )}
        </div>
      </div>

      {/* ===== DROPLET DESCRIPTION MODAL ===== */}
      {selectedId && (
        <div
          className="bg-opacity-20 dark:bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {completedDroplets.find((d) => d.id === selectedId)?.name ||
                  createdDroplets.find((d) => d.id === selectedId)?.name}
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 5-Star Rating Display */}
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {droplet.averageRating.toFixed(1)}
                  </span>
                </div>
              ) : null;
            })()}

            {/* Droplet Description */}
            <div
              className="mb-4 text-sm text-gray-700 dark:text-gray-300"
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

            {/* View Droplet Button */}
            <Link
              href={`/d/${
                completedDroplets.find((d) => d.id === selectedId)?.slug ||
                createdDroplets.find((d) => d.id === selectedId)?.slug
              }`}
              // open in new
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              View Droplet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
