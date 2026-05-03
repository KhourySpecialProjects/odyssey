"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Droplet } from "@/types";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { IconDroplet } from "@tabler/icons-react";
import {
  applySort,
  matchesSearch,
  dropletMatchesFilters,
  DropletFilterParams,
} from "@/components/my-content/apply-sort-filter";
import {
  CREATOR_DEFAULT_SORT,
  TAB_ALLOWED_PARAMS,
} from "@/components/my-content/sort-filter-options";

interface DropletsCreatorGridProps {
  droplets: Droplet[];
}

export function DropletsCreatorGrid({ droplets }: DropletsCreatorGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const sortKey = searchParams.get("sort") ?? CREATOR_DEFAULT_SORT.slug;

  const filterParams: DropletFilterParams = {
    status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
    visibility:
      searchParams.get("visibility")?.split(",").filter(Boolean) ?? [],
    focusArea: searchParams.get("focusArea")?.split(",").filter(Boolean) ?? [],
    type: searchParams.get("type")?.split(",").filter(Boolean) ?? [],
    difficulty:
      searchParams.get("difficulty")?.split(",").filter(Boolean) ?? [],
  };

  const filtered = useMemo(() => {
    const sorted = applySort(droplets, sortKey);
    return sorted
      .filter((d) => matchesSearch(d, q))
      .filter((d) => dropletMatchesFilters(d, filterParams));
  }, [droplets, sortKey, q, searchParams]);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    TAB_ALLOWED_PARAMS.droplets
      .filter((key) => key !== "tab")
      .forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (droplets.length === 0) {
    return (
      <EmptyState
        icon={
          <IconDroplet
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No droplets yet"
        message="Create a new droplet to get started."
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={
            <IconDroplet
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No matching droplets"
          message="No droplets match your current search or filters."
          className="w-full"
        />
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((droplet) => (
        <DropletTile
          key={droplet.id}
          droplet={droplet}
          isArchived={droplet.isHidden ?? false}
          isCreator={true}
          creatorArchive={true}
          showCreatedDate={true}
        />
      ))}
    </ul>
  );
}
