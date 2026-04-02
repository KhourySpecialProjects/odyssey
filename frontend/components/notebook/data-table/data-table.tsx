"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedDataset } from "@/lib/dataset-parser";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A row in the table — each key is a column name, value is the cell value. */
type RowData = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a column type string to a Tailwind class for cell alignment / font. */
function getCellClass(columnType: string): string {
  switch (columnType) {
    case "number":
      return "font-mono text-right tabular-nums text-slate-700 dark:text-slate-300";
    case "boolean":
      return "text-center text-slate-600 dark:text-slate-400";
    case "date":
      return "font-mono text-slate-600 dark:text-slate-400";
    default:
      return "text-slate-800 dark:text-slate-200";
  }
}

/** Format a cell value for display. */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

// ---------------------------------------------------------------------------
// Sort icon helper
// ---------------------------------------------------------------------------

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return (
      <ArrowUp className="ml-1 inline h-3 w-3 text-slate-700 dark:text-slate-300" />
    );
  if (sorted === "desc")
    return (
      <ArrowDown className="ml-1 inline h-3 w-3 text-slate-700 dark:text-slate-300" />
    );
  return (
    <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40 group-hover:opacity-80" />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableProps {
  dataset: ParsedDataset;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Interactive data table for notebook datasets.
 *
 * Features:
 * - Column sorting (click header: asc → desc → none)
 * - Per-column text filter inputs (shown below each header)
 * - Global search across all columns
 * - Pagination (25 / 50 / 100 rows per page)
 * - Horizontal scroll for wide tables; sticky first column on small viewports
 * - Styled like a Jupyter DataFrame: compact rows, alternating row colors,
 *   monospace font for numeric columns
 * - Row and column count in the footer
 *
 * Powered by TanStack Table v8 (headless).
 */
export function DataTable({ dataset, className }: DataTableProps) {
  const { columnNames, columnTypes, rows, rowCount, columnCount } = dataset;

  // ---------------------------------------------------------------------------
  // Table state
  // ---------------------------------------------------------------------------
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // ---------------------------------------------------------------------------
  // Data — convert row arrays to objects keyed by column name.
  // Memoized so we don't rebuild on every render.
  // ---------------------------------------------------------------------------
  const data = useMemo<RowData[]>(() => {
    return rows.map((row) => {
      const obj: RowData = {};
      columnNames.forEach((name, idx) => {
        obj[name] = row[idx];
      });
      return obj;
    });
  }, [rows, columnNames]);

  // ---------------------------------------------------------------------------
  // Column definitions — memoized for performance.
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    return columnNames.map((name, idx) => {
      const colType = columnTypes[idx] ?? "string";
      return {
        id: name,
        accessorKey: name,
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="group flex w-full items-center gap-0.5 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {name}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span
              className={cn("block truncate text-xs", getCellClass(colType))}
              title={formatCellValue(value)}
            >
              {formatCellValue(value)}
            </span>
          );
        },
        filterFn: "includesString",
        enableSorting: true,
        enableColumnFilter: true,
      } satisfies ColumnDef<RowData>;
    });
  }, [columnNames, columnTypes]);

  // ---------------------------------------------------------------------------
  // Table instance
  // ---------------------------------------------------------------------------
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
    globalFilterFn: "includesString",
  });

  const headerGroups = table.getHeaderGroups();
  const rows_ = table.getRowModel().rows;
  const filteredRowCount = table.getFilteredRowModel().rows.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="data-table"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {/* Toolbar: global search + page size selector */}
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      {/* Table wrapper — horizontal scroll for wide tables */}
      <div className="w-full overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Row index column */}
                <th
                  className="sticky left-0 w-10 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  aria-label="Row index"
                >
                  #
                </th>

                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="min-w-[6rem] px-3 py-2 text-left"
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}

            {/* Per-column filter inputs */}
            {headerGroups.map((headerGroup) => (
              <tr
                key={`${headerGroup.id}-filters`}
                className="border-b border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                {/* Empty cell for row-index column */}
                <td className="sticky left-0 bg-white px-2 py-1 dark:bg-slate-900" />

                {headerGroup.headers.map((header) => (
                  <td key={header.id} className="px-2 py-1">
                    <input
                      type="text"
                      value={
                        (header.column.getFilterValue() as
                          | string
                          | undefined) ?? ""
                      }
                      onChange={(e) =>
                        header.column.setFilterValue(
                          e.target.value || undefined,
                        )
                      }
                      placeholder={`Filter ${header.column.id}…`}
                      aria-label={`Filter ${header.column.id}`}
                      className={cn(
                        "h-6 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs",
                        "placeholder:text-slate-400 focus:border-slate-400 focus:ring-0 focus:outline-none",
                        "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500",
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows_.length === 0 ? (
              <tr>
                <td
                  colSpan={columnNames.length + 1}
                  className="py-8 text-center text-sm text-slate-400 dark:text-slate-500"
                >
                  No results match your search.
                </td>
              </tr>
            ) : (
              rows_.map((row, rowIdx) => {
                // Global row index for display (within the FULL filtered set,
                // not just the current page)
                const globalIdx =
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                  rowIdx +
                  1;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-slate-100 transition-colors last:border-0 dark:border-slate-800",
                      rowIdx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-800/40",
                      "hover:bg-blue-50/60 dark:hover:bg-blue-900/20",
                    )}
                  >
                    {/* Row index */}
                    <td className="sticky left-0 w-10 bg-inherit px-2 py-1 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                      {globalIdx}
                    </td>

                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="max-w-xs px-3 py-1.5 align-middle"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <DataTablePagination table={table} />

      {/* Footer: row and column counts */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <span>
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {rowCount} rows
          </span>
          {filteredRowCount !== rowCount && (
            <span className="ml-1">({filteredRowCount} filtered)</span>
          )}
          {" \u00B7 "}
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {columnCount} columns
          </span>
        </span>
        <span className="hidden sm:inline">Powered by TanStack Table</span>
      </div>
    </div>
  );
}
