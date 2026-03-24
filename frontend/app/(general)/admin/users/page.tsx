import { Suspense } from "react";
import { UsersPage } from "@/components/admin/users/users-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="w-full px-[56px] py-8">
      <div className="mb-4">
        <h1 className="text-[40px] font-semibold leading-tight text-black dark:text-white">
          Users
        </h1>
        <p className="mt-1 text-[20px] text-[#475569] dark:text-slate-400">
          The following users have access to this application.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <UsersPage />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-[44px] w-[641px] animate-pulse rounded-[30px] bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-10 w-[100px] animate-pulse rounded-[8px] bg-slate-200" />
          <div className="h-10 w-[80px] animate-pulse rounded-[8px] bg-slate-200" />
          <div className="h-10 w-[133px] animate-pulse rounded-[8px] bg-slate-200" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)]">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[40%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#eaecf0] bg-[#fcfcfd]">
              <th className="h-[55px] pl-[30px] pr-6 py-3 text-left text-[16px] font-medium text-[#667085]">Name</th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">Roles</th>
              <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[#eaecf0]">
                <td className="h-[56px] pl-[30px] pr-6 py-3">
                  <div className="h-4 w-[200px] animate-pulse rounded bg-slate-200" />
                </td>
                <td className="h-[56px] px-6 py-3">
                  <div className="flex gap-[5px]">
                    <div className="h-[26px] w-[60px] animate-pulse rounded-[16px] bg-slate-200" />
                    <div className="h-[26px] w-[90px] animate-pulse rounded-[16px] bg-slate-100" />
                  </div>
                </td>
                <td className="h-[56px] px-6 py-3">
                  <div className="flex gap-[30px]">
                    <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
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
