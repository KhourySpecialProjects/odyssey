"use client"

import { useState } from "react";
import { Button } from "./button";

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

        <div className="flex justify-end items-center mt-4 ">
            <div className="flex gap-2">
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`${currentPage === 1 ? "dark:text-slate-600 text-slate-400" : ""} dark:text-white`}
                >
                    <ChevronLeft />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    (pageNum >= curPage - 1 && pageNum <= curPage + 1) || pageNum == totalPages || pageNum == 1 ? (
                        <button
                            key={pageNum}
                            onClick={() => handlePageClick(pageNum)}
                            disabled={curPage == pageNum}
                            className={`text-white p-2 ${pageNum === curPage ? "dark:text-slate-600 text-slate-400" : ""}`}
                        >
                            {pageNum}
                        </button>

                ) : totalPages > 3 && (pageNum === totalPages - 1) ? (
                <div className="flex items-end pb-2">
                    <p key={pageNum - 0.5} >...</p>
                </div>
                ) : null
                ))}


                <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`${currentPage === totalPages ? "dark:text-slate-600 text-slate-400" : ""} text-white`}
                >
                    <ChevronRight />
                </button>
            </div>
        </div>
    )


}