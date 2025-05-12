import { Skeleton } from "@/components/ui/skeleton";

export function DropletsSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col space-y-3">
        <Skeleton
          className="aspect-video w-full rounded-xl"
          data-testid="skeleton-item"
        />
      </div>
      <div className="flex flex-col space-y-3">
        <Skeleton
          className="aspect-video w-full rounded-xl"
          data-testid="skeleton-item"
        />
      </div>
      <div className="flex flex-col space-y-3">
        <Skeleton
          className="aspect-video w-full rounded-xl"
          data-testid="skeleton-item"
        />
      </div>
    </div>
  );
}
