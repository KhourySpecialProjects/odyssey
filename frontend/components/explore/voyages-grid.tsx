import { Voyage } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { IconMap } from "@tabler/icons-react";
import { VoyageCard } from "@/components/voyages/voyage-card";

interface VoyagesGridProps {
  voyages: Voyage[];
}

export function VoyagesGrid({ voyages }: VoyagesGridProps) {
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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {voyages.map((voyage) => (
        <VoyageCard key={voyage.id} voyage={voyage} />
      ))}
    </div>
  );
}
