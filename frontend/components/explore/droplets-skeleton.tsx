import { Skeleton } from "@/components/ui/skeleton";

export function DropletsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="flex flex-col space-y-3">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
      <div className="flex flex-col space-y-3">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
      <div className="flex flex-col space-y-3">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    </div>
  );
}
