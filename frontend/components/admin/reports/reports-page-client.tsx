"use client";

import { useMemo, useState, useTransition } from "react";
import type { Report } from "./reports";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/admin/search-bar";
import { SortButton } from "@/components/admin/sort-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { deleteReport } from "@/lib/actions";
import { toast } from "sonner";
import { IconTrash, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ——— Sort config ———
const SORT_GROUPS = [
  {
    header: "Name",
    options: [
      { value: "name-asc", label: "A–Z" },
      { value: "name-desc", label: "Z–A" },
    ],
  },
  {
    header: "Date",
    options: [
      { value: "date-desc", label: "Newest first" },
      { value: "date-asc", label: "Oldest first" },
    ],
  },
] as const;

const DESC_CHAR_LIMIT = 50;
const PATH_CHAR_LIMIT = 40;

const REPORT_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[20%]" },
  { label: "Description", width: "w-[37%]" },
  { label: "Path", width: "w-[28%]" },
  { label: "Actions", width: "w-[15%]" },
];

// ——— Report Row ———
function ReportRow({ report }: { report: Report }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const isPathLong = report.path && report.path.length > PATH_CHAR_LIMIT;

  const strippedDescription = useMemo(
    () =>
      report.description
        ?.replace(/<\/p>\s*<p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?p>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim(),
    [report.description],
  );

  const isTruncated =
    strippedDescription && strippedDescription.length > DESC_CHAR_LIMIT;

  const displayDescription =
    !expanded && isTruncated
      ? strippedDescription.slice(0, DESC_CHAR_LIMIT) + "..."
      : strippedDescription;

  const handleDelete = () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    startTransition(async () => {
      const response = await deleteReport(report.id);
      if (response?.success) {
        toast.success("Report removed");
      } else {
        toast.error("Failed to remove report");
      }
    });
  };

  return (
    <tr
      className={cn(
        "border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {/* Name */}
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <p className="truncate text-[16px] font-medium text-[#101828] dark:text-white">
          {report.fullName}
        </p>
      </td>

      {/* Description */}
      <td className="h-[56px] px-6 py-[11px]">
        <p className="text-[16px] leading-[20px] font-medium text-[#101828] dark:text-white">
          {displayDescription}
          {isTruncated && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="ml-1 text-[#2D7597] hover:underline"
            >
              See More
            </button>
          )}
          {expanded && isTruncated && (
            <button
              onClick={() => setExpanded(false)}
              className="ml-1 text-[#2D7597] hover:underline"
            >
              See Less
            </button>
          )}
        </p>
      </td>

      {/* Path */}
      <td className="h-[56px] px-6 py-[11px]">
        {pathExpanded ? (
          <p className="text-[16px] font-medium break-all text-[#101828] dark:text-white">
            {report.path}{" "}
            <button
              onClick={() => setPathExpanded(false)}
              className="text-[#2D7597] hover:underline"
            >
              See Less
            </button>
          </p>
        ) : (
          <div className="flex min-w-0 items-center gap-1 text-[16px] font-medium text-[#101828] dark:text-white">
            <span className="min-w-0 truncate">{report.path}</span>
            {isPathLong && (
              <button
                onClick={() => setPathExpanded(true)}
                className="shrink-0 text-[#2D7597] hover:underline"
              >
                See More
              </button>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="h-[56px] px-6 py-3">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-[10px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[30px] w-[30px] p-0"
                  asChild
                >
                  <Link href={report.path} target="_blank">
                    <IconExternalLink className="h-4 w-4 text-[#2D7597]" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visit page</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="h-[30px] w-[30px] p-0 text-red-500 hover:bg-slate-100 hover:text-red-500 dark:text-red-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete report</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </td>
    </tr>
  );
}

// ——— Main Client Component ———
export function ReportsPageClient({ reports }: { reports: Report[] }) {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
  } = useAdminTableFilters<Report>({
    items: reports,
    defaultSort: "date-desc",
    searchFn: (r, q) =>
      !!(
        r.fullName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.path?.toLowerCase().includes(q)
      ),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) =>
          (a.fullName || "").localeCompare(b.fullName || ""),
        );
      } else if (sort === "name-desc") {
        sorted.sort((a, b) =>
          (b.fullName || "").localeCompare(a.fullName || ""),
        );
      } else if (sort === "date-desc") {
        sorted.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );
      } else if (sort === "date-asc") {
        sorted.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
      }
      return sorted;
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="Search reports…"
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
        </div>
      </div>

      <AdminTable
        columns={REPORT_COLUMNS}
        isEmpty={pageItems.length === 0}
        emptyMessage="No reports found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageItems.map((report) => (
          <ReportRow key={report.id} report={report} />
        ))}
      </AdminTable>
    </div>
  );
}
