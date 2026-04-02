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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { IconPencil } from "@tabler/icons-react";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";

const PLAYLIST_COLUMNS: AdminColumnDef[] = [
  { label: "Title", width: "w-[35%]" },
  { label: "Groups", width: "w-[10%]" },
  { label: "Droplets", width: "w-[10%]" },
  { label: "Lessons", width: "w-[10%]" },
  { label: "Duration", width: "w-[15%]" },
  { label: "Actions", width: "w-[10%]" },
];

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
    playlist.droplets?.reduce((sum, d) => sum + (d.lessons?.length ?? 0), 0) ??
    0;
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
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <Link
          href={`/p/${playlist.slug}`}
          prefetch={false}
          className="truncate text-[16px] font-medium text-[#101828] underline hover:text-[#2D7597] dark:text-white"
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
              "rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
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
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="edit playlist"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <Link href={`/draft/p/${playlist.slug}`} prefetch={false}>
                    <IconPencil className="h-4 w-4 text-sky-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit playlist</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
}

// ——— PlaylistMobileCard ———
function PlaylistMobileCard({ playlist }: { playlist: PlaylistWithCounts }) {
  const durationConfig = DURATION_CONFIG[playlist.duration] ?? null;

  return (
    <Link
      href={`/draft/p/${playlist.slug}`}
      prefetch={false}
      className="block w-full rounded-xl border border-[#e2e8f0] bg-white p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-[#101828] dark:text-white">
          {playlist.name}
        </p>
        <span className="shrink-0 text-slate-400">&#8250;</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#667085] dark:text-slate-400">
          {playlist.dropletsCount} droplet{playlist.dropletsCount !== 1 && "s"}
        </span>
        <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
        <span className="text-xs text-[#667085] dark:text-slate-400">
          {playlist.lessonsCount} lesson{playlist.lessonsCount !== 1 && "s"}
        </span>
        <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
        <span className="text-xs text-[#667085] dark:text-slate-400">
          {playlist.groupsCount} group{playlist.groupsCount !== 1 && "s"}
        </span>
        {durationConfig && (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              durationConfig.className,
            )}
          >
            {durationConfig.label}
          </Badge>
        )}
      </div>
    </Link>
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
            <SortRadioGroup
              groups={SORT_GROUPS}
              value={draftSortBy}
              onChange={setDraftSortBy}
            />
          </SortButton>

          <FilterButton
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hasActiveFilters={hasActiveFilters}
          >
            <FilterCheckboxGroup
              options={FILTER_DURATION_OPTIONS}
              selected={draftFilterDurations}
              onToggle={toggleDraftFilterDuration}
            />
          </FilterButton>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={PLAYLIST_COLUMNS}
        isEmpty={pagePlaylists.length === 0}
        emptyMessage="No playlists found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        mobileCards={pagePlaylists.map((playlist) => (
          <PlaylistMobileCard key={playlist.id} playlist={playlist} />
        ))}
      >
        {pagePlaylists.map((playlist) => (
          <PlaylistTableRow key={playlist.id} playlist={playlist} />
        ))}
      </AdminTable>
    </div>
  );
}
