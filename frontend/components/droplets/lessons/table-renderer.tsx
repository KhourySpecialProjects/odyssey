"use client";

import React from "react";

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
                const bgColor = cell.backgroundColor || "inherit";
                return (
                  <th
                    key={cellIndex}
                    className="border border-slate-300 px-4 py-2 text-left font-semibold dark:border-slate-600"
                    style={{
                      backgroundColor:
                        bgColor !== "inherit" ? bgColor : undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: cell.content }}
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
                  const bgColor = cell.backgroundColor || null;
                  return (
                    <td
                      key={cellIndex}
                      className="border border-slate-300 px-4 py-2 dark:border-slate-600"
                      style={{
                        backgroundColor: bgColor || undefined,
                      }}
                      dangerouslySetInnerHTML={{ __html: cell.content }}
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
