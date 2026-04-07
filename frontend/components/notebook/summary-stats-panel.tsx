"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { SummaryStats, ColumnStats } from "@/lib/dataset-parser";

// ---------------------------------------------------------------------------
// Type badge color mapping
// ---------------------------------------------------------------------------

const TYPE_BADGE_CLASSES: Record<string, string> = {
  number:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  string:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  boolean:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  date: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  unknown:
    "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number to exactly 2 decimal places. */
function fmt(value: number): string {
  return value.toFixed(2);
}

/** Compute null percentage string, e.g. "5 nulls (0.50%)". */
function nullLabel(nullCount: number, totalRows: number): string {
  if (nullCount === 0) return "0 nulls";
  const pct =
    totalRows > 0 ? ((nullCount / totalRows) * 100).toFixed(2) : "0.00";
  return `${nullCount} nulls (${pct}%)`;
}

// ---------------------------------------------------------------------------
// ColumnStatsCard
// ---------------------------------------------------------------------------

interface ColumnStatsCardProps {
  column: ColumnStats;
  totalRows: number;
}

function ColumnStatsCard({ column, totalRows }: ColumnStatsCardProps) {
  const badgeClass =
    TYPE_BADGE_CLASSES[column.type] ?? TYPE_BADGE_CLASSES.unknown;
  const isNumeric = column.type === "number";

  return (
    <div
      data-testid="column-stats-card"
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Column name + type badge */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
          {column.name}
        </span>
        <span
          data-testid="column-type-badge"
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
            badgeClass,
          )}
        >
          {column.type}
        </span>
      </div>

      {/* Null count */}
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {nullLabel(column.nullCount, totalRows)}
      </p>

      {/* Numeric stats */}
      {isNumeric && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {column.min !== undefined && (
            <StatRow label="min" value={fmt(column.min)} />
          )}
          {column.max !== undefined && (
            <StatRow label="max" value={fmt(column.max)} />
          )}
          {column.mean !== undefined && (
            <StatRow label="mean" value={fmt(column.mean)} />
          )}
          {column.median !== undefined && (
            <StatRow label="median" value={fmt(column.median)} />
          )}
          {column.std !== undefined && (
            <StatRow label="std" value={fmt(column.std)} />
          )}
        </div>
      )}

      {/* String/other: unique count */}
      {!isNumeric && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {column.uniqueCount} unique
        </p>
      )}
    </div>
  );
}

/** A single label/value pair rendered in the numeric stats grid. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
        {value}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// SummaryStatsPanel
// ---------------------------------------------------------------------------

interface SummaryStatsPanelProps {
  stats: SummaryStats;
  className?: string;
}

/**
 * Collapsible panel that displays summary statistics for a parsed dataset.
 *
 * - Shape badge: "N rows x M columns"
 * - Column cards in a responsive grid, each showing:
 *   - Column name and inferred type badge
 *   - Null count / percentage
 *   - For numeric columns: min, max, mean, median, std (2 decimal places)
 *   - For other columns: unique count
 * - Collapsed by default; toggled by a header button
 */
export function SummaryStatsPanel({
  stats,
  className,
}: SummaryStatsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [rowCount, colCount] = stats.shape;

  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      {/* Panel header / toggle */}
      <CardHeader className="p-0">
        <button
          aria-expanded={isOpen}
          aria-label={
            isOpen ? "Collapse summary statistics" : "Expand summary statistics"
          }
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between px-4 py-3",
            "text-left transition-colors",
            "hover:bg-slate-50 dark:hover:bg-slate-800",
            "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 focus-visible:outline-none",
          )}
        >
          <div className="flex items-center gap-2">
            <BarChart2
              size={16}
              className="shrink-0 text-slate-500 dark:text-slate-400"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Summary Statistics
            </span>
            {/* Shape badge — always visible */}
            <Badge
              variant="outline"
              className="ml-1 border-slate-300 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              {rowCount} rows x {colCount} columns
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown
              size={16}
              className="shrink-0 text-slate-400 dark:text-slate-500"
            />
          ) : (
            <ChevronRight
              size={16}
              className="shrink-0 text-slate-400 dark:text-slate-500"
            />
          )}
        </button>
      </CardHeader>

      {/* Collapsible column stats grid — only rendered when open */}
      {isOpen && (
        <div data-testid="column-stats-grid">
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stats.columns.map((col) => (
                <ColumnStatsCard
                  key={col.name}
                  column={col}
                  totalRows={rowCount}
                />
              ))}
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}
