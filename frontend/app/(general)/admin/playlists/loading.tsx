function RowSkeleton() {
  return (
    <tr className="border-b border-[#eaecf0] dark:border-slate-700">
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <div className="h-4 w-[180px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-4 w-[30px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-4 w-[30px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-4 w-[30px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-[26px] w-[70px] animate-pulse rounded-[16px] bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
    </tr>
  );
}

export default function PlaylistsLoading() {
  return (
    <div className="w-full px-[56px] py-8">
      <div className="mt-4 mb-2 px-4 pt-4 pb-2">
        <div className="h-9 w-[140px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-5 w-[340px] animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
      </div>

      <div className="space-y-4">
        {/* Controls skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-[818px] animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-[100px] animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-[80px] animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] dark:border-slate-700">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                <th className="h-[55px] py-3 pr-6 pl-[30px] text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Title
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Groups
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Droplets
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Lessons
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Duration
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {Array.from({ length: 8 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
              {/* Pagination row skeleton */}
              <tr className="border-t border-[#eaecf0] dark:border-slate-700">
                <td colSpan={6} className="h-[56px] px-[30px] py-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-[80px] animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700"
                        />
                      ))}
                    </div>
                    <div className="h-8 w-[60px] animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
