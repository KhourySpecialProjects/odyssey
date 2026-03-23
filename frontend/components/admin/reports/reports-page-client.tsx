"use client";

import { useMemo, useState, useTransition } from "react";
import type { Report } from "./reports";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { SortButton } from "@/components/admin/sort-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { deleteReport } from "@/lib/actions";
import { toast } from "sonner";
import { IconTrash } from "@tabler/icons-react";
import Link from "next/link";

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

const DESC_CHAR_LIMIT = 80;

const REPORT_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[20%]" },
  { label: "Description", width: "w-[40%]" },
  { label: "Path", width: "w-[18%]" },
  { label: "Actions", width: "w-[22%]" },
];

// ——— Report Row ———
function ReportRow({ report }: { report: Report }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

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
      <td className="h-[80px] py-3 pr-6 pl-[30px]">
        <p className="truncate text-[16px] font-medium text-[#101828] dark:text-white">
          {report.fullName}
        </p>
      </td>

      {/* Description */}
      <td className="h-[80px] px-6 py-[11px]">
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
      <td className="h-[80px] px-6 py-[11px]">
        <Badge
          variant="outline"
          className="max-w-full truncate rounded-[16px] border-0 bg-[#f2f4f7] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium text-[#60646c] dark:bg-slate-700 dark:text-slate-300"
        >
          {report.path}
        </Badge>
      </td>

      {/* Actions */}
      <td className="h-[80px] px-6 py-3">
        <div className="flex items-center gap-[10px]">
          <Link
            href={report.path}
            target="_blank"
            className="inline-flex items-center rounded-[16px] bg-[#2D7597] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium text-white transition-colors hover:bg-[#255e78]"
          >
            Visit Page
          </Link>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
            title="Delete report"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
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
          className="max-w-[560px]"
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
