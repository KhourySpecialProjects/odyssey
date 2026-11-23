import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shown inside the droplet layout (sidebar stays put) while an overview,
// lesson, or recap page loads, so lesson-to-lesson navigation gives
// immediate feedback instead of freezing on the previous lesson. The spacing
// mirrors a lesson page so content doesn't jump when it arrives:
// DropletLessonWrapper and LessonRenderer each add pt-6 (pt-12 here), then a
// 2.5rem title, then blocks from mt-8. recap/loading.tsx passes its padding.
export default function Loading({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex w-full flex-col px-40 pt-12", className)}
      role="status"
    >
      <span className="sr-only">Loading lesson</span>
      <div className="flex h-[3.75rem] items-center">
        <Skeleton className="h-10 w-1/2" />
      </div>
      <div className="mt-8 space-y-3">
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
