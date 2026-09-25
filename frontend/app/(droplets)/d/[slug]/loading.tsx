import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the droplet layout (sidebar stays put) while an overview,
// lesson, or recap page loads, so lesson-to-lesson navigation gives
// immediate feedback instead of freezing on the previous lesson.
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-prose px-4 py-8"
      aria-busy="true"
      aria-label="Loading lesson"
    >
      <Skeleton className="mb-6 h-9 w-2/3" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="my-8 h-48 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
