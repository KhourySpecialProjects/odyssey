"use client";

import { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  className?: string;
}

/**
 * Toolbar for the interactive data table.
 *
 * Contains:
 * - Global search input (searches across all columns)
 * - Rows-per-page selector (25 / 50 / 100)
 * - Clear search button
 */
export function DataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  className,
}: DataTableToolbarProps<TData>) {
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Global search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-8 pl-8 text-xs"
          aria-label="Search all columns"
        />
        {globalFilter && (
          <button
            onClick={() => onGlobalFilterChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Rows per page */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="whitespace-nowrap">Rows per page</span>
        <div className="flex gap-1">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <Button
              key={size}
              variant={pageSize === size ? "default" : "outline"}
              size="xs"
              onClick={() => table.setPageSize(size)}
              aria-label={`Show ${size} rows per page`}
              aria-pressed={pageSize === size}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
