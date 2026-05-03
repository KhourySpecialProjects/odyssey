"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Voyage } from "@/types";
import { VoyageCard } from "@/components/voyages/voyage-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { IconMap } from "@tabler/icons-react";
import {
  applySort,
  matchesSearch,
  voyageMatchesFilters,
  VoyageFilterParams,
} from "@/components/my-content/apply-sort-filter";
import {
  CREATOR_DEFAULT_SORT,
  TAB_ALLOWED_PARAMS,
} from "@/components/my-content/sort-filter-options";

interface VoyagesCreatorGridProps {
  voyages: Voyage[];
  currentUserId?: number;
}

export function VoyagesCreatorGrid({
  voyages,
  currentUserId,
}: VoyagesCreatorGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const sortKey = searchParams.get("sort") ?? CREATOR_DEFAULT_SORT.slug;

  const filterParams: VoyageFilterParams = {
    visibility:
      searchParams.get("visibility")?.split(",").filter(Boolean) ?? [],
  };

  const filtered = useMemo(() => {
    const sorted = applySort(voyages, sortKey);
    return sorted
      .filter((v) => matchesSearch(v, q))
      .filter((v) => voyageMatchesFilters(v, filterParams));
  }, [voyages, sortKey, q, searchParams]);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    TAB_ALLOWED_PARAMS.voyages
      .filter((key) => key !== "tab")
      .forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (voyages.length === 0) {
    return (
      <EmptyState
        icon={
          <IconMap
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No voyages yet"
        message="Create a new voyage to get started."
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={
            <IconMap
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No matching voyages"
          message="No voyages match your current search or filters."
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
      {filtered.map((voyage) => (
        <li key={voyage.id}>
          <VoyageCard
            voyage={voyage}
            isArchived={voyage.isArchived ?? false}
            isCreator={
              currentUserId
                ? voyage.authors?.some((a) => a.id === currentUserId) ?? false
                : false
            }
            dashboardPage={true}
          />
        </li>
      ))}
    </ul>
  );
}
