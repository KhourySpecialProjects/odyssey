"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { AnnouncementType, AuthorizedUser } from "@/types";
import { cn } from "@/lib/utils";
import { FeedClient } from "./feed-client";

const FILTER_OPTIONS: { value: AnnouncementTypeTitle; label: string }[] = [
  { value: AnnouncementTypeTitle.System, label: "System" },
  { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
  { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
  { value: AnnouncementTypeTitle.Group, label: "Group" },
  { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  { value: AnnouncementTypeTitle.Kudos, label: "Kudos" },
];

export function FeedCenterContent({ authUser }: { authUser: AuthorizedUser }) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );

  const toggleRole = (role: AnnouncementTypeTitle) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  return (
    <div className="flex h-full flex-col px-4 py-6 md:px-8">
      {/* Greeting */}
      <div className="mb-5 shrink-0">
        <h1 className="text-3xl font-semibold text-black dark:text-white">
          Hi, {authUser.firstName || "there"}!
        </h1>
        <p className="mt-1 text-sm text-[#475569] md:text-base dark:text-slate-400">
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
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleRole(option.value)}
              className={cn(
                "rounded-full border-[1.5px] px-3 py-0.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-[#287697] text-[#287697] hover:bg-[#287697]/10"
                  : "border-[#D0D5DD] text-neutral-500 hover:bg-neutral-100 dark:border-slate-700 dark:hover:bg-slate-800",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="min-h-0 flex-1">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          authUser={authUser}
        />
      </div>
    </div>
  );
}
