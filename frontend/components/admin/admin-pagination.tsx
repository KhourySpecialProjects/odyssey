"use client";

import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  colSpan?: number;
  variant?: "desktop" | "mobile";
}

export function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
  colSpan = 3,
  variant = "desktop",
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  if (variant === "mobile") {
    return (
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
          className="text-sm font-medium text-[#344054] disabled:opacity-40 dark:text-slate-300"
        >
          ‹ Prev
        </button>
        <span className="text-sm text-[#667085] dark:text-slate-400">
          {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
          className="text-sm font-medium text-[#2D7597] disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
    );
  }

  return (
    <tr className="border-t border-[#eaecf0] dark:border-slate-700">
      <td colSpan={colSpan} className="h-[56px] px-[30px] py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] py-[6px] text-[14px] font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
                const isEllipsis =
                  totalPages > 5 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  (pageNum < currentPage - 1 || pageNum > currentPage + 1);
                const prevWasEllipsis =
                  totalPages > 5 &&
                  pageNum - 1 !== 1 &&
                  pageNum - 1 !== totalPages &&
                  (pageNum - 1 < currentPage - 1 ||
                    pageNum - 1 > currentPage + 1);

                if (isEllipsis) {
                  return prevWasEllipsis ? null : (
                    <span
                      key={`ellipsis-${pageNum}`}
                      className="px-1 text-[14px] text-[#344054] dark:text-slate-400"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      "h-8 min-w-8 rounded-[8px] px-2 text-[14px] font-medium transition-colors",
                      pageNum === currentPage
                        ? "border border-[#d0d5dd] bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        : "text-[#344054] hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              },
            )}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] py-[6px] text-[14px] font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </td>
    </tr>
  );
}
