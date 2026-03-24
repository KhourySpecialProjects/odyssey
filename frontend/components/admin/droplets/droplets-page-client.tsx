"use client";

import { useState } from "react";
import { Droplet } from "@/types";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { cn, uppercaseFirstChar } from "@/lib/utils";
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
  { label: "Title", width: "w-[45%]" },
  { label: "Tags", width: "w-[35%]" },
  { label: "Actions", width: "w-[20%]" },
];

// ——— Tag display config ———
const TAG_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  technical: { bg: "bg-[#e2e9ff]", text: "text-[#58579c]" },
  skill: { bg: "bg-[#fae6f3]", text: "text-[#855169]" },
  knowledge: { bg: "bg-[#f9f7e6]", text: "text-[#7f6b55]" },
  professional: { bg: "bg-[#def2fd]", text: "text-[#284965]" },
  databases: { bg: "bg-[#e0f2fe]", text: "text-[#0c4a6e]" },
  interviews: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  cloud: { bg: "bg-[#ede9fe]", text: "text-[#5b21b6]" },
  security: { bg: "bg-[#fce7f3]", text: "text-[#9d174d]" },
  networking: { bg: "bg-[#d1fae5]", text: "text-[#065f46]" },
  algorithms: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]" },
  web: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]" },
  ai: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  "machine learning": { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  devops: { bg: "bg-[#ccfbf1]", text: "text-[#134e4a]" },
  testing: { bg: "bg-[#fff7ed]", text: "text-[#9a3412]" },
};

// Fallback: hash the tag name to pick a color from a vibrant palette
const FALLBACK_COLORS = [
  { bg: "bg-[#fce4ec]", text: "text-[#880e4f]" },
  { bg: "bg-[#e8eaf6]", text: "text-[#283593]" },
  { bg: "bg-[#e0f7fa]", text: "text-[#00695c]" },
  { bg: "bg-[#fff3e0]", text: "text-[#e65100]" },
  { bg: "bg-[#f3e5f5]", text: "text-[#6a1b9a]" },
  { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]" },
  { bg: "bg-[#fce4ec]", text: "text-[#ad1457]" },
  { bg: "bg-[#e1f5fe]", text: "text-[#01579b]" },
];

function getTagColors(name: string) {
  const key = name.toLowerCase();
  if (TAG_TYPE_COLORS[key]) return TAG_TYPE_COLORS[key];
  // Hash the name to consistently pick a color
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

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
      await updateDroplet(droplet.id, { isHidden: next });
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

        {/* Tags */}
        <td className="h-[56px] px-6 py-[11px]">
          <div className="flex flex-wrap gap-[5px]">
            {/* Type badge */}
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
            {/* Tag badges */}
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
        <td className="h-[56px] py-3 pr-6 pl-10">
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
    filterFn: (d, types) => types.includes(d.type),
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
              options={FILTER_TYPE_OPTIONS}
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
