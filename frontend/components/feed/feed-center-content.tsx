"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { AuthorizedUser } from "@/types";
import { cn } from "@/lib/utils";
import { feedColorFor } from "@/lib/feed-colors";
import { FeedClient, InitialFeed } from "./feed-client";
import {
  FILTER_SEPARATOR,
  FILTER_VALUES,
  parseFilters,
  toFeedRoles,
} from "./feed-filter-params";

const FILTER_OPTIONS: { value: AnnouncementTypeTitle; label: string }[] = [
  { value: AnnouncementTypeTitle.System, label: "System" },
  { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
  { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
  { value: AnnouncementTypeTitle.Group, label: "Group" },
  { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  { value: AnnouncementTypeTitle.Kudos, label: "Kudos" },
];

export function FeedCenterContent({
  authUser,
  initialFeed,
  pending,
}: {
  authUser: AuthorizedUser;
  initialFeed?: InitialFeed;
  pending?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Keyed on the raw param so re-renders don't hand FeedClient new arrays.
  const rawFilters = searchParams.get("filters");
  const selectedRoles = useMemo(() => parseFilters(rawFilters), [rawFilters]);
  const feedRoles = useMemo(() => toFeedRoles(selectedRoles), [selectedRoles]);

  const setSelected = useCallback(
    (next: AnnouncementTypeTitle[]) => {
      const params = new URLSearchParams(searchParams);
      const isAll =
        next.length === FILTER_VALUES.length &&
        FILTER_VALUES.every((v) => next.includes(v));
      if (isAll) {
        params.delete("filters");
      } else {
        params.set(
          "filters",
          next.map((v) => v.toLowerCase()).join(FILTER_SEPARATOR),
        );
      }
      const qs = params.toString();
      // Native history updates useSearchParams without a server round trip;
      // FeedClient fetches the new filters itself.
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [pathname, searchParams],
  );

  const toggleRole = (role: AnnouncementTypeTitle) => {
    setSelected(
      selectedRoles.includes(role)
        ? selectedRoles.filter((r) => r !== role)
        : [...selectedRoles, role],
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Filter pills */}
      <div className="mb-4 flex shrink-0 flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = selectedRoles.includes(option.value);
          const colors = feedColorFor(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleRole(option.value)}
              className={cn(
                "rounded-full border-[1.5px] px-3 py-0.5 text-sm font-medium transition-colors",
                isActive ? colors.pillActive : colors.pillInactive,
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
          selectedRoles={feedRoles}
          authUser={authUser}
          initialFeed={initialFeed}
          pending={pending}
        />
      </div>
    </div>
  );
}
