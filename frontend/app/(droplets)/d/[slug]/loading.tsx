import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the droplet layout (sidebar stays put) while an overview,
// lesson, or recap page loads, so lesson-to-lesson navigation gives
// immediate feedback instead of freezing on the previous lesson. The spacing
// mirrors DropletLessonWrapper / LessonRenderer (px-40 pt-6, a 2.5rem title,
// blocks from mt-8) so content doesn't jump when the page arrives.
export default function Loading() {
  return (
    <div className="flex w-full flex-col px-40 pt-6" role="status">
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
