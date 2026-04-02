"use client";

import { useState } from "react";
import { Droplet } from "@/types";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { cn, uppercaseFirstChar } from "@/lib/utils";
import { getTagColors } from "@/lib/tag-colors";
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
import {
  IconChartBar,
  IconPencil,
  IconEyeOff,
  IconEye,
} from "@tabler/icons-react";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";
import dynamic from "next/dynamic";
const DropletAnalyticsModal = dynamic(
  () =>
    import("./droplet-analytics-modal").then((m) => m.DropletAnalyticsModal),
  { ssr: false },
);

const DROPLET_COLUMNS: AdminColumnDef[] = [
  { label: "Title", width: "w-[35%]" },
  { label: "Type", width: "w-[10%]" },
  { label: "Focus Area", width: "w-[12%]" },
  { label: "Tags", width: "w-[23%]" },
  { label: "Actions", width: "w-[20%]" },
];

const DEFAULT_SORT = "title-asc";

const SORT_GROUPS = [
  {
    header: "Title",
    options: [
      { value: "title-asc", label: "A\u2013Z" },
      { value: "title-desc", label: "Z\u2013A" },
    ],
  },
] as const;

const FILTER_TYPE_OPTIONS = [
  { value: "knowledge", label: "Knowledge" },
  { value: "skill", label: "Skill" },
] as const;

const FILTER_FOCUS_AREA_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "technical", label: "Technical" },
  { value: "professional", label: "Professional" },
] as const;

const TYPE_VALUES = new Set(["knowledge", "skill"]);
const FOCUS_AREA_VALUES = new Set(["personal", "technical", "professional"]);

// ——— DropletTableRow ———
function DropletTableRow({ droplet }: { droplet: Droplet }) {
  const [isHidden, setIsHidden] = useState(droplet.isHidden);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const typeColors = getTagColors(droplet.type);

  async function handleToggleVisibility() {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    const next = !isHidden;
    setIsHidden(next);
    try {
      const result = await updateDroplet(droplet.id, { isHidden: next });
      if (!result.ok) {
        setIsHidden(!next);
        toast.error(result.error ?? "Failed to update visibility");
      }
    } catch {
      setIsHidden(!next);
      toast.error("Failed to update visibility");
    }
  }

  return (
    <>
      {analyticsOpen && (
        <DropletAnalyticsModal
          droplet={droplet}
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
        />
      )}
      <tr className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
        {/* Title */}
        <td className="h-[56px] py-3 pr-6 pl-[30px]">
          <Link
            href={`/d/${droplet.slug}`}
            prefetch={false}
            className="truncate text-[16px] font-medium text-[#101828] underline hover:text-[#2D7597] dark:text-white"
          >
            {droplet.name}
          </Link>
        </td>

        {/* Type */}
        <td className="h-[56px] px-6 py-[11px]">
          <Badge
            variant="outline"
            className={cn(
              "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
              typeColors.bg,
              typeColors.text,
            )}
          >
            {uppercaseFirstChar(droplet.type)}
          </Badge>
        </td>

        {/* Focus Area */}
        <td className="h-[56px] px-6 py-[11px]">
          {droplet.focusArea &&
            (() => {
              const focusColors = getTagColors(droplet.focusArea);
              return (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                    focusColors.bg,
                    focusColors.text,
                  )}
                >
                  {uppercaseFirstChar(droplet.focusArea)}
                </Badge>
              );
            })()}
        </td>

        {/* Tags */}
        <td className="h-[56px] px-6 py-[11px]">
          <div className="flex flex-wrap gap-[5px]">
            {droplet.tags?.map((tag) => {
              const colors = getTagColors(tag.name);
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={cn(
                    "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                    colors.bg,
                    colors.text,
                  )}
                >
                  {tag.name}
                </Badge>
              );
            })}
          </div>
        </td>

        {/* Actions */}
        <td className="h-[56px] px-6 py-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="edit droplet"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <Link href={`/draft/d/${droplet.slug}`} prefetch={false}>
                      <IconPencil className="h-4 w-4 text-sky-600" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit droplet</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="analytics"
                    className="h-8 w-8 p-0"
                    onClick={() => setAnalyticsOpen(true)}
                  >
                    <IconChartBar className="h-4 w-4 text-sky-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View analytics</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={isHidden ? "show droplet" : "hide droplet"}
                    className="h-8 w-8 p-0"
                    onClick={handleToggleVisibility}
                  >
                    <span
                      className={cn(
                        "transition-transform duration-200",
                        isAnimating && "scale-125",
                      )}
                    >
                      {isHidden ? (
                        <IconEyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <IconEye className="h-4 w-4 text-sky-600" />
                      )}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isHidden
                    ? "Hidden — click to publish"
                    : "Visible — click to hide"}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </td>
      </tr>
    </>
  );
}

// ——— Main Client Component ———
export function DropletsPageClient({ droplets }: { droplets: Droplet[] }) {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: pageDroplets,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters: draftFilterTypes,
    toggleDraftFilter: toggleDraftFilterType,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<Droplet>({
    items: droplets,
    defaultSort: DEFAULT_SORT,
    searchFn: (d, q) => d.name.toLowerCase().includes(q),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "title-asc") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "title-desc") {
        sorted.sort((a, b) => b.name.localeCompare(a.name));
      }
      return sorted;
    },
    filterFn: (d, filters) => {
      const activeTypes = filters.filter((f) => TYPE_VALUES.has(f));
      const activeFocus = filters.filter((f) => FOCUS_AREA_VALUES.has(f));
      const typeMatch =
        activeTypes.length === 0 || activeTypes.includes(d.type);
      const focusMatch =
        activeFocus.length === 0 || activeFocus.includes(d.focusArea);
      return typeMatch && focusMatch;
    },
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
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#667085] uppercase">
              Type
            </p>
            <FilterCheckboxGroup
              options={FILTER_TYPE_OPTIONS}
              selected={draftFilterTypes}
              onToggle={toggleDraftFilterType}
            />
            <p className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-[#667085] uppercase">
              Focus Area
            </p>
            <FilterCheckboxGroup
              options={FILTER_FOCUS_AREA_OPTIONS}
              selected={draftFilterTypes}
              onToggle={toggleDraftFilterType}
            />
          </FilterButton>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={DROPLET_COLUMNS}
        isEmpty={pageDroplets.length === 0}
        emptyMessage="No droplets found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageDroplets.map((droplet) => (
          <DropletTableRow key={droplet.id} droplet={droplet} />
        ))}
      </AdminTable>
    </div>
  );
}
