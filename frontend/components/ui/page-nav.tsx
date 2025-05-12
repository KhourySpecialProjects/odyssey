"use client";

import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageNavProps {
  currentPage: number;
  updatePage: (num: number) => void;
  totalPages: number;
}

export function PageNav({ currentPage, updatePage, totalPages }: PageNavProps) {
  const [curPage, setCurPage] = useState(currentPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      updatePage(curPage + 1);
      setCurPage(curPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      updatePage(curPage - 1);
      setCurPage(curPage - 1);
    }
  };

  const handlePageClick = (pageNum: number) => {
    updatePage(pageNum);
    setCurPage(pageNum);
  };

  return (
    <div className="mt-4 flex items-center justify-end">
      <div className="flex gap-2">
        <button
          key="prev"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          aria-label="chevron-left"
          className={`${currentPage === 1 ? "text-slate-400 dark:text-slate-600" : ""}`}
        >
          <ChevronLeft />
        </button>

        {/* Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) =>
          (pageNum >= curPage - 1 && pageNum <= curPage + 1) ||
          pageNum == totalPages ||
          pageNum == 1 ? (
            <button
              key={`page-${pageNum}`}
              onClick={() => handlePageClick(pageNum)}
              disabled={curPage == pageNum}
              className={`p-2 ${pageNum === curPage ? "rounded-md border border-slate-300" : ""} font-bold`}
            >
              {pageNum}
            </button>
          ) : totalPages > 3 &&
            (pageNum === totalPages - 1 || pageNum === 2) ? (
            <div key={`ellipsis-${pageNum}`} className="flex items-end pb-2">
              <p>...</p>
            </div>
          ) : null,
        )}

        <button
          key="next"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          aria-label="chevron-right"
          className={`${currentPage === totalPages ? "text-slate-400 dark:text-slate-600" : ""}`}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
