function StatCardSkeleton() {
  return (
    <div className="h-auto min-h-[100px] animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] md:h-[130px] dark:bg-slate-800">
      <div className="px-3 pt-3 md:px-[27px] md:pt-[14px]">
        <div className="h-4 w-[80px] rounded bg-slate-200 md:h-[18px] md:w-[120px] dark:bg-slate-700" />
        <div className="mt-2 h-7 w-[60px] rounded bg-slate-200 md:mt-[10px] md:h-[40px] md:w-[80px] dark:bg-slate-700" />
        <div className="mt-1 h-3 w-[100px] rounded bg-slate-200 md:mt-[8px] md:h-[16px] md:w-[140px] dark:bg-slate-700" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = "h-[280px]" }: { height?: string }) {
  return (
    <div
      className={`${height} animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800`}
    >
      <div className="px-5 pt-4">
        <div className="h-[20px] w-[180px] rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-[14px] w-[260px] rounded bg-slate-100 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-7 w-[100px] animate-pulse rounded bg-slate-200 md:h-[40px] md:w-[140px] dark:bg-slate-700" />
        <div className="mt-2 h-4 w-[240px] animate-pulse rounded bg-slate-100 md:h-[20px] md:w-[380px] dark:bg-slate-700" />
      </div>

      {/* Mobile: 2x2 stats + chart */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="mt-4 md:hidden">
        <ChartSkeleton height="h-[200px]" />
      </div>

      {/* Desktop: stat cards + pageview chart */}
      <div className="hidden md:grid md:grid-cols-[524fr_578fr] md:items-start md:gap-[25px]">
        <div className="grid grid-cols-2 gap-5">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
      </div>

      {/* Desktop: bottom charts */}
      <div className="mt-5 hidden md:grid md:grid-cols-[682fr_421fr] md:gap-5">
        <ChartSkeleton height="h-[396px]" />
        <ChartSkeleton height="h-[396px]" />
      </div>

      {/* Mobile: bottom chart */}
      <div className="mt-4 md:hidden">
        <ChartSkeleton height="h-[200px]" />
      </div>
    </div>
  );
}
