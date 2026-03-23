"use client";

import { useMemo } from "react";
import { Group } from "@/types";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pencil, Archive } from "lucide-react";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";

const GROUP_COLUMNS: AdminColumnDef[] = [
  { label: "Title", width: "w-[50%]" },
  { label: "Members", width: "w-[15%]" },
  { label: "Semester", width: "w-[20%]" },
  { label: "Actions", width: "w-[15%]" },
];

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
    header: "Members",
    options: [
      { value: "members-asc", label: "Ascending" },
      { value: "members-desc", label: "Descending" },
    ],
  },
] as const;

// Semester filter options are derived from actual data in the component below

// ——— GroupTableRow ———
function GroupTableRow({ group }: { group: Group }) {
  const membersCount = group.members?.length ?? 0;

  return (
    <tr className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
      {/* Title */}
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <Link
          href={`/g/${group.slug}`}
          className="truncate text-[16px] font-medium text-[#101828] underline hover:text-[#2D7597] dark:text-white"
        >
          {group.groupName}
        </Link>
      </td>

      {/* Members */}
      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {membersCount}
        </span>
      </td>

      {/* Semester */}
      <td className="h-[56px] px-6 py-[11px]">
        {group.semester ? (
          <Badge
            variant="outline"
            className={cn(
              "rounded-[16px] border-0 bg-[#f2f4f7] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium text-[#60646c]",
            )}
          >
            {group.semester}
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
            aria-label="edit group"
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4 text-sky-600" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="archive group"
            className="h-8 w-8 p-0"
          >
            <Archive className="h-4 w-4 text-sky-600" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ——— Main Client Component ———
export function GroupsPageClient({ groups }: { groups: Group[] }) {
  // Derive semester options from actual data instead of hardcoding
  const semesterOptions = useMemo(() => {
    const unique = [...new Set(groups.map((g) => g.semester))].sort();
    return unique.map((s) => ({ value: s, label: s }));
  }, [groups]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: pageGroups,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters: draftFilterSemesters,
    toggleDraftFilter: toggleDraftFilterSemester,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<Group>({
    items: groups,
    defaultSort: DEFAULT_SORT,
    searchFn: (g, q) => g.groupName.toLowerCase().includes(q),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) => a.groupName.localeCompare(b.groupName));
      } else if (sort === "name-desc") {
        sorted.sort((a, b) => b.groupName.localeCompare(a.groupName));
      } else if (sort === "members-asc") {
        sorted.sort(
          (a, b) => (a.members?.length ?? 0) - (b.members?.length ?? 0),
        );
      } else if (sort === "members-desc") {
        sorted.sort(
          (a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0),
        );
      }
      return sorted;
    },
    filterFn: (g, semesters) => semesters.includes(g.semester),
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
              options={semesterOptions}
              selected={draftFilterSemesters}
              onToggle={toggleDraftFilterSemester}
            />
          </FilterButton>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={GROUP_COLUMNS}
        isEmpty={pageGroups.length === 0}
        emptyMessage="No groups found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageGroups.map((group) => (
          <GroupTableRow key={group.id} group={group} />
        ))}
      </AdminTable>
    </div>
  );
}
