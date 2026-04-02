import { CardSkeletonList } from "@/components/admin/card-skeleton";

function RowSkeleton() {
  return (
    <tr className="border-b border-[#eaecf0]">
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-[200px] animate-pulse rounded bg-slate-200" />
        </div>
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
  );
}

export default function UsersLoading() {
  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mt-4 mb-2 px-4 pt-4 pb-2">
        <div className="h-7 w-[100px] animate-pulse rounded bg-slate-200 md:h-9" />
        <div className="mt-2 h-4 w-[200px] animate-pulse rounded bg-slate-100 md:h-5 md:w-[300px]" />
      </div>

      <div className="space-y-4">
        {/* Controls skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded-full bg-slate-200 sm:w-[560px]" />
          <div className="flex gap-2">
            <div className="h-10 w-[70px] animate-pulse rounded-md bg-slate-200 md:w-[100px]" />
            <div className="h-10 w-[60px] animate-pulse rounded-md bg-slate-200 md:w-[80px]" />
            <div className="h-10 w-[80px] animate-pulse rounded-md bg-slate-200 md:w-[130px]" />
          </div>
        </div>

        {/* Mobile card skeletons */}
        <CardSkeletonList showAvatar />

        {/* Desktop table skeleton */}
        <div className="hidden overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] md:block">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[45%]" />
              <col className="w-[40%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd]">
                <th className="h-[55px] py-3 pr-6 pl-[30px] text-left text-[16px] font-medium text-[#667085]">
                  Name
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">
                  Roles
                </th>
                <th className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {Array.from({ length: 10 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
              <tr className="border-t border-[#eaecf0]">
                <td colSpan={3} className="h-[56px] px-[30px] py-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-[80px] animate-pulse rounded-[8px] bg-slate-200" />
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 animate-pulse rounded-[8px] bg-slate-200"
                        />
                      ))}
                    </div>
                    <div className="h-8 w-[60px] animate-pulse rounded-[8px] bg-slate-200" />
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
