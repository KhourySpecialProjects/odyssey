import { Suspense } from "react";
import { RequestsPage } from "@/components/admin/requests/requests-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="w-full px-[56px] py-8">
      <div className="mb-6">
        <h1 className="text-[40px] leading-tight font-semibold text-black dark:text-white">
          Requests
        </h1>
        <p className="mt-1 text-[20px] text-[#475569] dark:text-slate-400">
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
      <div className="h-[45px] w-[334px] animate-pulse rounded-[97px] bg-slate-200" />

      {/* Controls skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-[44px] w-[560px] animate-pulse rounded-[30px] bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-10 w-[100px] animate-pulse rounded-[8px] bg-slate-200" />
            <div className="h-10 w-[89px] animate-pulse rounded-[8px] bg-slate-200" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)]">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[35%]" />
              <col className="w-[15%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd]">
                <th className="h-[55px] py-3 pr-6 pl-[30px] text-left text-[16px] font-medium text-[#667085]">
                  Name
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">
                  Email
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">
                  College
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#eaecf0]">
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
