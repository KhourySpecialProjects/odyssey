"use client";

import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  className?: string;
}

/**
 * Pagination controls for the interactive data table.
 *
 * Shows:
 * - First / Previous / Next / Last page buttons
 * - Current page indicator and total page count
 */
export function DataTablePagination<TData>({
  table,
  className,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  // Compute the row range shown on the current page
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  if (pageCount <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 sm:flex-row sm:justify-between",
        className,
      )}
    >
      {/* Row range label */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {totalRows === 0
          ? "No results"
          : `Showing ${firstRow}–${lastRow} of ${totalRows} rows`}
      </p>

      {/* Page navigation */}
      <div
        className="flex items-center gap-1"
        role="navigation"
        aria-label="Pagination"
      >
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-2 text-xs text-slate-600 dark:text-slate-400">
          Page {pageIndex + 1} of {pageCount}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
