"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { AnnouncementType, AuthorizedUser } from "@/types";
import { cn } from "@/lib/utils";
import { FriendRequests } from "../friends/friend-requests";
import { Button } from "../ui/button";
import Link from "next/link";
import { Users } from "lucide-react";

const FILTER_OPTIONS: { value: AnnouncementTypeTitle; label: string }[] = [
  { value: AnnouncementTypeTitle.System, label: "System" },
  { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
  { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
  { value: AnnouncementTypeTitle.Group, label: "Group" },
  { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  { value: AnnouncementTypeTitle.Kudos, label: "Kudos" },
];

export function FeedContainer({ authUser }: { authUser: AuthorizedUser }) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );

  const toggleRole = (role: AnnouncementTypeTitle) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-6 md:flex-row">
      {/* Left sidebar — Friend Requests */}
      <aside className="hidden shrink-0 md:block md:w-[300px] lg:w-[360px]">
        <div className="flex h-full flex-col rounded-[30px] border-2 border-gray-200/60 bg-white p-6 dark:bg-neutral-900">
          <h2 className="mb-3 shrink-0 text-2xl font-semibold text-black dark:text-white">
            Friend Requests
          </h2>
          <Link
            href="/settings/friends"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 block shrink-0"
          >
            <Button className="w-full rounded-full bg-[#287697] hover:bg-[#1f6080]">
              <Users className="mr-2 h-5 w-5" />
              Manage Friends
            </Button>
          </Link>
          <div className="min-h-0 flex-1">
            <FriendRequests
              noProfile={true}
              friendsPerPage={5}
              authUser={authUser}
              showTitle={false}
            />
          </div>
        </div>
      </aside>

      {/* Right — greeting, filters, feed */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Greeting */}
        <div className="mb-5 shrink-0">
          <h1 className="text-4xl font-semibold text-black dark:text-white">
            Hi, {authUser.firstName || "there"}!
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Check out what&apos;s happening right now.
          </p>
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex shrink-0 flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = selectedRoles.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleRole(option.value)}
                className={cn(
                  "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#287697] text-[#287697]"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Feed — fills remaining height */}
        <div className="min-h-0 flex-1 rounded-[30px] border-2 border-gray-200/60 bg-white p-6 dark:bg-neutral-900">
          <FeedClient
            selectedRoles={selectedRoles.map(
              (role) => role.toLowerCase() as AnnouncementType,
            )}
            authUser={authUser}
          />
        </div>
      </div>
    </div>
  );
}
