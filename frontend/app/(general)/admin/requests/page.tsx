import { Suspense } from "react";
import { RequestsPage } from "@/components/admin/requests/requests-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
          Requests
        </h1>
        <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          Manage access requests and content creator applications.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <RequestsPage />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="h-[45px] w-[334px] animate-pulse rounded-[97px] bg-slate-200 dark:bg-slate-700" />

      {/* Controls skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-[44px] w-full animate-pulse rounded-[30px] bg-slate-200 sm:w-[560px] dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-[70px] animate-pulse rounded-[8px] bg-slate-200 md:w-[100px]" />
            <div className="h-10 w-[60px] animate-pulse rounded-[8px] bg-slate-200 md:w-[89px]" />
          </div>
        </div>

        {/* Mobile card skeletons */}
        <div className="flex flex-col gap-2 md:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#e2e8f0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-slate-100" />
            </div>
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
                    <div className="h-4 w-[140px] animate-pulse rounded bg-slate-200" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="h-4 w-[220px] animate-pulse rounded bg-slate-200" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="h-[26px] w-[60px] animate-pulse rounded-[16px] bg-slate-200" />
                  </td>
                  <td className="h-[56px] px-6 py-3">
                    <div className="flex gap-[5px]">
                      <div className="h-[26px] w-[80px] animate-pulse rounded-[16px] bg-slate-200" />
                      <div className="h-[26px] w-[70px] animate-pulse rounded-[16px] bg-slate-200" />
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
