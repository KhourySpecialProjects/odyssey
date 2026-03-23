"use client";

import { useMemo } from "react";
import { Playlist, Group } from "@/types";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";

// Extended type for playlists with populated groups from API
interface PlaylistWithGroups extends Playlist {
  groups?: Group[];
}
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";

// ——— Duration display config ———
const DURATION_CONFIG: Record<string, { label: string; className: string }> = {
  short: {
    label: "Short",
    className: "bg-[#ecfdf3] text-[#14ba6d] border-0",
  },
  medium: {
    label: "Medium",
    className: "bg-[#fcfbf3] text-[#f89d03] border-0",
  },
  long: {
    label: "Long",
    className: "bg-[#fdf0f1] text-[#de3b48] border-0",
  },
};

const DEFAULT_SORT = "name-asc";

const SORT_GROUPS = [
  {
    header: "Name",
    options: [
      { value: "name-asc", label: "A\u2013Z" },
      { value: "name-desc", label: "Z\u2013A" },
    ],
  },
  {
    header: "Droplets",
    options: [
      { value: "droplets-asc", label: "Ascending" },
      { value: "droplets-desc", label: "Descending" },
    ],
  },
  {
    header: "Lessons",
    options: [
      { value: "lessons-asc", label: "Ascending" },
      { value: "lessons-desc", label: "Descending" },
    ],
  },
] as const;

const FILTER_DURATION_OPTIONS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
] as const;

// Extend playlist type for admin display with computed counts
interface PlaylistWithCounts extends Playlist {
  groupsCount: number;
  dropletsCount: number;
  lessonsCount: number;
}

function computeCounts(playlist: PlaylistWithGroups): PlaylistWithCounts {
  const dropletsCount = playlist.droplets?.length ?? 0;
  const lessonsCount =
    playlist.droplets?.reduce(
      (sum, d) => sum + (d.lessons?.length ?? 0),
      0,
    ) ?? 0;
  const groups = playlist.groups;
  const groupsCount = Array.isArray(groups) ? groups.length : 0;

  return {
    ...playlist,
    groupsCount,
    dropletsCount,
    lessonsCount,
  };
}

// ——— PlaylistTableRow ———
function PlaylistTableRow({ playlist }: { playlist: PlaylistWithCounts }) {
  const durationConfig = DURATION_CONFIG[playlist.duration] ?? null;

  return (
    <tr className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
      {/* Title */}
      <td className="h-[56px] pl-[30px] pr-6 py-3">
        <Link
          href={`/p/${playlist.slug}`}
          className="truncate text-[16px] font-medium text-[#101828] underline dark:text-white hover:text-[#2D7597]"
        >
          {playlist.name}
        </Link>
      </td>

      {/* Groups */}
      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {playlist.groupsCount}
        </span>
      </td>

      {/* Droplets */}
      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {playlist.dropletsCount}
        </span>
      </td>

      {/* Lessons */}
      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {playlist.lessonsCount}
        </span>
      </td>

      {/* Duration */}
      <td className="h-[56px] px-6 py-[11px]">
        {durationConfig ? (
          <Badge
            variant="outline"
            className={cn(
              "rounded-[16px] px-[9px] py-[4px] text-[14px] font-medium leading-[18px]",
              durationConfig.className,
            )}
          >
            {durationConfig.label}
          </Badge>
        ) : (
          <span className="text-sm text-slate-400">&mdash;</span>
        )}
      </td>

      {/* Actions */}
      <td className="h-[56px] px-6 py-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="edit playlist"
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4 text-sky-600" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ——— Main Client Component ———
export function PlaylistsPageClient({
  playlists,
}: {
  playlists: PlaylistWithGroups[];
}) {
  const playlistsWithCounts = useMemo(
    () => playlists.map(computeCounts),
    [playlists],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: pagePlaylists,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters: draftFilterDurations,
    toggleDraftFilter: toggleDraftFilterDuration,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<PlaylistWithCounts>({
    items: playlistsWithCounts,
    defaultSort: DEFAULT_SORT,
    searchFn: (p, q) => p.name.toLowerCase().includes(q),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "name-desc") {
        sorted.sort((a, b) => b.name.localeCompare(a.name));
      } else if (sort === "droplets-asc") {
        sorted.sort((a, b) => a.dropletsCount - b.dropletsCount);
      } else if (sort === "droplets-desc") {
        sorted.sort((a, b) => b.dropletsCount - a.dropletsCount);
      } else if (sort === "lessons-asc") {
        sorted.sort((a, b) => a.lessonsCount - b.lessonsCount);
      } else if (sort === "lessons-desc") {
        sorted.sort((a, b) => b.lessonsCount - a.lessonsCount);
      }
      return sorted;
    },
    filterFn: (p, durations) => durations.includes(p.duration),
  });

  return (
    <div className="space-y-4">
      {/* Controls — search left, sort+filter right */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="Search by title..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-[818px]"
        />
        <div className="flex items-center gap-2">
          <SortButton onApply={handleSortApply} onReset={handleSortReset}>
            <SortRadioGroup groups={SORT_GROUPS} value={draftSortBy} onChange={setDraftSortBy} />
          </SortButton>

          <FilterButton
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hasActiveFilters={hasActiveFilters}
          >
            <FilterCheckboxGroup options={FILTER_DURATION_OPTIONS} selected={draftFilterDurations} onToggle={toggleDraftFilterDuration} />
          </FilterButton>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] dark:border-slate-700">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
              <th className="h-[55px] pl-[30px] pr-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Title
              </th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Groups
              </th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Droplets
              </th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Lessons
              </th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Duration
              </th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {pagePlaylists.length > 0 ? (
              pagePlaylists.map((playlist) => (
                <PlaylistTableRow key={playlist.id} playlist={playlist} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No playlists found.
                </td>
              </tr>
            )}
            {/* Pagination row inside table */}
            <AdminPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} colSpan={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
