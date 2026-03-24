import { Suspense } from "react";
import { GroupsPage } from "@/components/admin/groups/groups-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="w-full px-[56px] py-8">
      <div className="mb-4">
        <h1 className="text-[40px] font-semibold leading-tight text-black dark:text-white">
          Groups
        </h1>
        <p className="mt-1 text-[20px] text-[#475569] dark:text-slate-400">
          The following groups have been created.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <GroupsPage />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-[44px] w-[818px] animate-pulse rounded-[30px] bg-slate-200 dark:bg-slate-700" />
        <div className="flex gap-2">
          <div className="h-10 w-[100px] animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-[80px] animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] dark:border-slate-700">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
              <th className="h-[55px] pl-[30px] pr-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">Title</th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">Members</th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">Semester</th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[#eaecf0] dark:border-slate-700">
                <td className="h-[56px] pl-[30px] pr-6 py-3">
                  <div className="h-4 w-[180px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
