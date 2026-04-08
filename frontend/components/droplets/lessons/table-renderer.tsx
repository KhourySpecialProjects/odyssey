"use client";

import React from "react";
import DOMPurify from "isomorphic-dompurify";
import { useTheme } from "next-themes";

// BlockNote stores cell background colors as named strings (e.g. "red", "blue").
// These must be mapped to actual CSS values to match the editor appearance.
// Source: @blocknote/core/src/editor/defaultColors.ts
const BLOCKNOTE_BG_COLORS: Record<string, { light: string; dark: string }> = {
  gray: { light: "#ebeced", dark: "#9b9a97" },
  brown: { light: "#e9e5e3", dark: "#64473a" },
  red: { light: "#fbe4e4", dark: "#be3434" },
  orange: { light: "#f6e9d9", dark: "#b7600a" },
  yellow: { light: "#fbf3db", dark: "#b58b00" },
  green: { light: "#ddedea", dark: "#4d6461" },
  blue: { light: "#ddebf1", dark: "#0b6e99" },
  purple: { light: "#eae4f2", dark: "#6940a5" },
  pink: { light: "#f4dfeb", dark: "#ad1a72" },
};

function resolveBackgroundColor(
  color: string | null,
  isDark: boolean,
): string | undefined {
  if (!color || color === "default") return undefined;
  const mapped = BLOCKNOTE_BG_COLORS[color];
  if (mapped) return isDark ? mapped.dark : mapped.light;
  // If it's already a CSS color value (hex, rgb, etc.), pass through
  return color;
}

interface TableData {
  markdown: string;
  hasHeaders: boolean;
  cellBackgroundColors: Record<string, string>;
  rows: Array<{
    cells: Array<{
      content: string;
      backgroundColor: string | null;
      rowIndex: number;
      cellIndex: number;
    }>;
  }>;
}

interface TableRendererProps {
  tableData: TableData;
}

export function TableRenderer({ tableData }: TableRendererProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Render table directly from data to have full control over styling
  const renderTableFromData = () => {
    if (!tableData.rows || tableData.rows.length === 0) {
      return null;
    }

    const headerRow =
      tableData.hasHeaders && tableData.rows.length > 0
        ? tableData.rows[0]
        : null;
    const bodyRows = tableData.hasHeaders
      ? tableData.rows.slice(1)
      : tableData.rows;

    return (
      <table className="w-full min-w-full border-collapse border border-slate-300 dark:border-slate-600">
        {headerRow && (
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr className="border-b border-slate-300 dark:border-slate-600">
              {headerRow.cells.map((cell, cellIndex) => {
                const bgColor = resolveBackgroundColor(
                  cell.backgroundColor,
                  isDark,
                );
                const sanitizedContent = DOMPurify.sanitize(cell.content);
                return (
                  <th
                    key={cellIndex}
                    className="border border-slate-300 px-4 py-2 text-left font-semibold dark:border-slate-600"
                    style={{
                      backgroundColor: bgColor,
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rowIndex) => {
            const actualRowIndex = tableData.hasHeaders
              ? rowIndex + 1
              : rowIndex;
            return (
              <tr
                key={actualRowIndex}
                className="border-t border-slate-300 dark:border-slate-600"
              >
                {row.cells.map((cell, cellIndex) => {
                  const bgColor = resolveBackgroundColor(
                    cell.backgroundColor,
                    isDark,
                  );
                  const sanitizedContent = DOMPurify.sanitize(cell.content);
                  return (
                    <td
                      key={cellIndex}
                      className="border border-slate-300 px-4 py-2 dark:border-slate-600"
                      style={{
                        backgroundColor: bgColor,
                      }}
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="-mx-4 my-4 overflow-x-auto md:mx-0">
      <div className="inline-block min-w-full">{renderTableFromData()}</div>
    </div>
  );
}
