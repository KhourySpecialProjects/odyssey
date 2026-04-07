export function CardSkeleton({ showAvatar }: { showAvatar?: boolean } = {}) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        {showAvatar && (
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
        )}
        <div className="flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-1.5 h-3 w-44 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeletonList({
  count = 6,
  showAvatar,
}: {
  count?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}
