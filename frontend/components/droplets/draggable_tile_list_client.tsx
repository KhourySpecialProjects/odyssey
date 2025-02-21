"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Droplet } from "@/types";
import DraggableDropletWideTile from "./draggable-droplet-wide-tile";

const ITEMS_PER_PAGE = 5;

export function DraggableTileListClient({
  droplets,
  moveCard,
  listType,
}: {
  droplets: Droplet[];
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  listType: "source" | "selected";
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(droplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDroplets = droplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {paginatedDroplets.map((droplet, index) => (
          <DraggableDropletWideTile
            key={droplet.id}
            droplet={droplet}
            index={index}
            moveCard={moveCard}
            sourceList={listType}
          />
        ))}
      </div>
      <div className="flex justify-end items-center mt-4 ">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`${currentPage === 1 ? "visibility: hidden" : "visibility: visible"}`}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className={`${currentPage >= totalPages ? "visibility: hidden" : "visibility: visible"}`}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
