"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Voyage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteVoyage } from "@/lib/requests/voyage";
import { cn } from "@/lib/utils";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { SearchBar } from "@/components/admin/search-bar";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: {
    label: "Published",
    className: "bg-[#ecfdf3] text-[#14ba6d] border-0",
  },
  draft: {
    label: "Draft",
    className: "bg-[#f8f9fa] text-[#667085] border-0",
  },
};

const VOYAGE_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[30%]" },
  { label: "Status", width: "w-[12%]" },
  { label: "Nodes", width: "w-[12%]" },
  { label: "Droplets", width: "w-[12%]" },
  { label: "Author", width: "w-[18%]" },
  { label: "Created", width: "w-[10%]" },
  { label: "Actions", width: "w-[10%]" },
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
    header: "Nodes",
    options: [
      { value: "nodes-asc", label: "Ascending" },
      { value: "nodes-desc", label: "Descending" },
    ],
  },
] as const;

const FILTER_STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
] as const;

interface VoyageWithCounts extends Voyage {
  nodeCount: number;
  dropletCount: number;
  authorName: string;
}

function computeCounts(voyage: Voyage): VoyageWithCounts {
  const nodes = voyage.voyage_nodes ?? [];
  const nodeCount = nodes.length;
  const dropletCount = nodes.reduce(
    (acc, n) => acc + (n.playlist?.droplets?.length ?? 0),
    0,
  );
  const authorName = voyage.authors?.length
    ? voyage.authors.map((a) => a.firstName || a.email).join(", ")
    : "\u2014";

  return { ...voyage, nodeCount, dropletCount, authorName };
}

// ——— VoyageTableRow ———
function VoyageTableRow({
  voyage,
  onDelete,
  isDeleting,
}: {
  voyage: VoyageWithCounts;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const statusConfig = STATUS_CONFIG[voyage.status] ?? null;

  return (
    <tr className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <Link
          href={`/v/${voyage.slug}`}
          prefetch={false}
          className="truncate text-[16px] font-medium text-[#101828] underline hover:text-[#2D7597] dark:text-white"
        >
          {voyage.name}
        </Link>
      </td>

      <td className="h-[56px] px-6 py-[11px]">
        {statusConfig ? (
          <Badge
            variant="outline"
            className={cn(
              "rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
              statusConfig.className,
            )}
          >
            {statusConfig.label}
          </Badge>
        ) : (
          <span className="text-sm text-slate-400">&mdash;</span>
        )}
      </td>

      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {voyage.nodeCount}
        </span>
      </td>

      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {voyage.dropletCount}
        </span>
      </td>

      <td className="h-[56px] px-6 py-3">
        <span className="truncate text-[16px] text-[#101828] dark:text-white">
          {voyage.authorName}
        </span>
      </td>

      <td className="h-[56px] px-6 py-3">
        <span className="text-[16px] text-[#101828] dark:text-white">
          {voyage.createdAt
            ? new Date(voyage.createdAt).toLocaleDateString()
            : "\u2014"}
        </span>
      </td>

      <td className="h-[56px] px-6 py-3">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="view voyage"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <Link href={`/v/${voyage.slug}`} prefetch={false}>
                    <IconPencil className="h-4 w-4 text-sky-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View voyage</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="delete voyage"
                  className="h-8 w-8 p-0"
                  onClick={() => onDelete(voyage.id)}
                  disabled={isDeleting}
                >
                  <IconTrash className="h-4 w-4 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete voyage</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
}

// ——— VoyageMobileCard ———
function VoyageMobileCard({ voyage }: { voyage: VoyageWithCounts }) {
  const statusConfig = STATUS_CONFIG[voyage.status] ?? null;

  return (
    <Link
      href={`/v/${voyage.slug}`}
      prefetch={false}
      className="block w-full rounded-xl border border-[#e2e8f0] bg-white p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-[#101828] dark:text-white">
          {voyage.name}
        </p>
        <span className="shrink-0 text-slate-400">&#8250;</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {statusConfig && (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              statusConfig.className,
            )}
          >
            {statusConfig.label}
          </Badge>
        )}
        <span className="text-xs text-[#667085] dark:text-slate-400">
          {voyage.nodeCount} node{voyage.nodeCount !== 1 && "s"}
        </span>
        <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
        <span className="text-xs text-[#667085] dark:text-slate-400">
          {voyage.dropletCount} droplet{voyage.dropletCount !== 1 && "s"}
        </span>
      </div>
    </Link>
  );
}

// ——— Main Client Component ———
export function VoyagesAdminPageClient({
  voyages: initialVoyages,
}: {
  voyages: Voyage[];
}) {
  const [voyages, setVoyages] = useState<Voyage[]>(initialVoyages);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const voyagesWithCounts = useMemo(
    () => voyages.map(computeCounts),
    [voyages],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: pageVoyages,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters,
    toggleDraftFilter,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<VoyageWithCounts>({
    items: voyagesWithCounts,
    defaultSort: DEFAULT_SORT,
    searchFn: (v, q) => v.name.toLowerCase().includes(q),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc")
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === "name-desc")
        sorted.sort((a, b) => b.name.localeCompare(a.name));
      else if (sort === "nodes-asc")
        sorted.sort((a, b) => a.nodeCount - b.nodeCount);
      else if (sort === "nodes-desc")
        sorted.sort((a, b) => b.nodeCount - a.nodeCount);
      return sorted;
    },
    filterFn: (v, statuses) => statuses.includes(v.status),
  });

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this voyage?")) return;
    setDeletingId(id);
    try {
      const result = await deleteVoyage(id);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to delete voyage.");
        return;
      }
      setVoyages((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voyage deleted.");
    } catch {
      toast.error("An unexpected error occurred while deleting the voyage.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="Search voyages..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-[700px]"
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
              options={FILTER_STATUS_OPTIONS}
              selected={draftFilters}
              onToggle={toggleDraftFilter}
            />
          </FilterButton>

          <Link href="/new/voyage">
            <Button className="shrink-0">New Voyage</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={VOYAGE_COLUMNS}
        isEmpty={pageVoyages.length === 0}
        emptyMessage="No voyages found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        mobileCards={pageVoyages.map((voyage) => (
          <VoyageMobileCard key={voyage.id} voyage={voyage} />
        ))}
      >
        {pageVoyages.map((voyage) => (
          <VoyageTableRow
            key={voyage.id}
            voyage={voyage}
            onDelete={handleDelete}
            isDeleting={deletingId === voyage.id}
          />
        ))}
      </AdminTable>
    </div>
  );
}
