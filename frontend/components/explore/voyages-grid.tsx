"use client";

import { Voyage } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { IconMap } from "@tabler/icons-react";
import { VoyageCard } from "@/components/voyages/voyage-card";
import { useSearch } from "@/contexts/SearchContext";
import { matchesSearch } from "@/lib/utils";
import { NoSearchResults } from "./no-search-results";

interface VoyagesGridProps {
  voyages: Voyage[];
}

export function VoyagesGrid({ voyages }: VoyagesGridProps) {
  // The Explore search box applies to this tab too
  const { searchQuery } = useSearch();

  if (!voyages || voyages.length === 0) {
    return (
      <EmptyState
        icon={
          <IconMap
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No voyages available"
        message="There are no published voyages available at this time."
      />
    );
  }

  const matching = voyages.filter((voyage) =>
    matchesSearch(searchQuery, [voyage.name, voyage.description]),
  );
  if (matching.length === 0) {
    return <NoSearchResults kind="Voyages" query={searchQuery} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {matching.map((voyage) => (
        <VoyageCard key={voyage.id} voyage={voyage} />
      ))}
    </div>
  );
}
