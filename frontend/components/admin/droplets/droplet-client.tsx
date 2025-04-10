"use client";

import { useState } from "react";
import { Droplet } from "@/types";
import { DropletBlock } from "./droplet-block";
import { PageNav } from "@/components/ui/page-nav";

const ITEMS_PER_PAGE = 10;

export function DropletClient({ droplets }: { droplets: Droplet[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(droplets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDroplets = droplets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
      {paginatedDroplets.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {paginatedDroplets.map((d: Droplet) => (
              <DropletBlock droplet={d} key={d.id} />
            ))}
          </ul>
          <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700"></hr>

          <PageNav
            currentPage={currentPage}
            updatePage={setCurrentPage}
            totalPages={totalPages}
          />
        </>
      ) : (
        <p>There are no created droplets.</p>
      )}
    </div>
  );
}
