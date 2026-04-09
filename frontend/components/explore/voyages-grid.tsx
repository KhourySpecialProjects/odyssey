import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Voyage } from "@/types";
import { VoyageCard } from "@/components/voyages/voyage-card";

interface VoyagesGridProps {
  voyages: Voyage[];
}

export function VoyagesGrid({ voyages }: VoyagesGridProps) {
  if (!voyages || voyages.length === 0) {
    return (
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Voyages Available" />
        <MessageDescription>
          There are no published voyages available at this time.
        </MessageDescription>
      </Message>
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
