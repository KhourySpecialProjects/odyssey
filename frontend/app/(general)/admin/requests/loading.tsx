function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
        <div className="flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export default function RequestsLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mt-4 mb-2 px-4 pt-4 pb-2">
        <div className="h-7 w-[120px] animate-pulse rounded bg-slate-200 md:h-9 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-[240px] animate-pulse rounded bg-slate-100 md:h-5 md:w-[380px] dark:bg-slate-700" />
      </div>

      <div className="space-y-4">
        {/* Tab skeleton */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-8 w-[120px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-[140px] animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
        </div>

        {/* Controls skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded-full bg-slate-200 sm:w-[560px] dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-[70px] animate-pulse rounded-md bg-slate-200 md:w-[100px] dark:bg-slate-700" />
            <div className="h-10 w-[60px] animate-pulse rounded-md bg-slate-200 md:w-[80px] dark:bg-slate-700" />
          </div>
        </div>

        {/* Mobile card skeletons */}
        <div className="flex flex-col gap-2 md:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Desktop table skeleton */}
        <div className="hidden overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] md:block dark:border-slate-700">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[35%]" />
              <col className="w-[15%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                <th className="h-[55px] py-3 pr-6 pl-[30px] text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Name
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Email
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  College
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-[#eaecf0] dark:border-slate-700"
                >
                  <td className="h-[56px] py-3 pr-6 pl-[30px]">
                    <div className="h-4 w-[120px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="h-4 w-[180px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="h-5 w-[60px] animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="flex gap-2">
                      <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
