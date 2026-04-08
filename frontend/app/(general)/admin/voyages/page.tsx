import { Suspense } from "react";
import { VoyagesAdminPage } from "@/components/admin/voyages/voyages-admin-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl leading-tight font-semibold text-black md:text-[40px] dark:text-white">
          Voyages
        </h1>
        <p className="mt-1 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          The following voyages have been created.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <VoyagesAdminPage />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Controls skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-[44px] w-full animate-pulse rounded-[30px] bg-slate-200 sm:w-[560px] dark:bg-slate-700" />
        <div className="h-10 w-[140px] animate-pulse rounded-[8px] bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Mobile card skeletons */}
      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#e2e8f0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] md:block dark:border-slate-700">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
              {[
                "Name",
                "Status",
                "Nodes",
                "Playlists",
                "Author",
                "Created",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] first:pl-[30px] dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr
                key={i}
                className="border-b border-[#eaecf0] dark:border-slate-700"
              >
                <td className="h-[56px] py-3 pr-6 pl-[30px]">
                  <div className="h-4 w-[180px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </td>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="h-[56px] px-6 py-3">
                    <div className="h-4 w-[50px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
