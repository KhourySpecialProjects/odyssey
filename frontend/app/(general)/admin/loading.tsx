function StatCardSkeleton() {
  return (
    <div className="h-[130px] animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="px-[27px] pt-[14px]">
        <div className="h-[18px] w-[120px] rounded bg-slate-200" />
        <div className="mt-[10px] h-[40px] w-[80px] rounded bg-slate-200" />
        <div className="mt-[8px] h-[16px] w-[140px] rounded bg-slate-200" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = "h-[280px]" }: { height?: string }) {
  return (
    <div
      className={`${height} animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]`}
    >
      <div className="px-5 pt-4">
        <div className="h-[20px] w-[180px] rounded bg-slate-200" />
        <div className="mt-3 h-[14px] w-[260px] rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="w-full px-[56px] py-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-[40px] w-[140px] animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-[20px] w-[380px] animate-pulse rounded bg-slate-100" />
      </div>

      {/* Top row: stat cards + pageview chart */}
      <div className="grid grid-cols-[524fr_578fr] items-start gap-[25px]">
        <div className="grid grid-cols-2 gap-5">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
      </div>

      {/* Bottom row: charts */}
      <div className="mt-5 grid grid-cols-[682fr_421fr] gap-5">
        <ChartSkeleton height="h-[396px]" />
        <ChartSkeleton height="h-[396px]" />
      </div>
    </div>
  );
}
