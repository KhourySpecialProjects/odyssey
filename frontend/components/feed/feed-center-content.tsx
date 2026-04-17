"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { AnnouncementType, AuthorizedUser } from "@/types";
import { cn } from "@/lib/utils";
import { feedColorFor } from "@/lib/feed-colors";
import { FeedClient } from "./feed-client";

const FILTER_OPTIONS: { value: AnnouncementTypeTitle; label: string }[] = [
  { value: AnnouncementTypeTitle.System, label: "System" },
  { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
  { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
  { value: AnnouncementTypeTitle.Group, label: "Group" },
  { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  { value: AnnouncementTypeTitle.Kudos, label: "Kudos" },
];

const FILTER_VALUES = Object.values(AnnouncementTypeTitle);
const VALUE_BY_SLUG = new Map(
  FILTER_VALUES.map((v) => [v.toLowerCase(), v as AnnouncementTypeTitle]),
);

// Uses "." as the separator (not "," so URLSearchParams doesn't %2C-encode it).
// None of the filter values contain a dot, so this is safe.
const FILTER_SEPARATOR = ".";

function parseFilters(raw: string | null): AnnouncementTypeTitle[] {
  if (raw === null) return FILTER_VALUES;
  if (raw === "") return [];
  // Backward-compat: accept "," too for shared links created before the
  // separator change.
  const parts = raw
    .split(/[.,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const matched = parts
    .map((slug) => VALUE_BY_SLUG.get(slug))
    .filter((v): v is AnnouncementTypeTitle => Boolean(v));
  return Array.from(new Set(matched));
}

export function FeedCenterContent({ authUser }: { authUser: AuthorizedUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedRoles = useMemo(
    () => parseFilters(searchParams.get("filters")),
    [searchParams],
  );

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
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
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
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          authUser={authUser}
        />
      </div>
    </div>
  );
}
