import { CardSkeletonList } from "@/components/admin/card-skeleton";

function RowSkeleton() {
  return (
    <tr className="border-b border-[#eaecf0] dark:border-slate-700">
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <div className="h-4 w-[180px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-4 w-[120px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-4 w-[30px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="h-[26px] w-[90px] animate-pulse rounded-[16px] bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="h-[56px] px-6 py-3">
        <div className="flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </td>
    </tr>
  );
}

export default function GroupsLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mt-4 mb-2 px-4 pt-4 pb-2">
        <div className="h-7 w-[100px] animate-pulse rounded bg-slate-200 md:h-9 md:w-[140px] dark:bg-slate-700" />
        <div className="mt-2 h-4 w-[200px] animate-pulse rounded bg-slate-100 md:h-5 md:w-[340px] dark:bg-slate-700" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded-full bg-slate-200 sm:w-[560px] dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-[70px] animate-pulse rounded-md bg-slate-200 md:w-[100px] dark:bg-slate-700" />
            <div className="h-10 w-[60px] animate-pulse rounded-md bg-slate-200 md:w-[80px] dark:bg-slate-700" />
          </div>
        </div>

        {/* Mobile card skeletons */}
        <CardSkeletonList />

        {/* Desktop table skeleton */}
        <div className="hidden overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] md:block dark:border-slate-700">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                <th className="h-[55px] py-3 pr-6 pl-[30px] text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Title
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Creator
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Members
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">
                  Semester
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
