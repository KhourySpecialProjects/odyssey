import { AdminPagination } from "./admin-pagination";

export type AdminColumnDef = {
  label: string;
  width: string;
};

interface AdminTableProps {
  columns: AdminColumnDef[];
  emptyMessage?: string;
  isEmpty: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  children: React.ReactNode;
  /** Mobile card list — rendered below md: instead of the table */
  mobileCards?: React.ReactNode;
}

export function AdminTable({
  columns,
  emptyMessage = "No results found.",
  isEmpty,
  currentPage,
  totalPages,
  onPageChange,
  children,
  mobileCards,
}: AdminTableProps) {
  return (
    <>
      {/* Mobile card list */}
      {mobileCards && (
        <div className="md:hidden">
          {isEmpty ? (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </p>
          ) : (
            <div className="flex flex-col gap-2">{mobileCards}</div>
          )}
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            variant="mobile"
          />
        </div>
      )}

      {/* Desktop table */}
      <div className={mobileCards ? "hidden md:block" : ""}>
        <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] dark:border-slate-700">
          <table className="w-full table-fixed">
            <colgroup>
              {columns.map((col, i) => (
                <col key={i} className={col.width} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`h-[55px] ${i === 0 ? "py-3 pr-6 pl-[30px]" : "px-6 py-3"} text-left text-[16px] font-medium text-[#667085] dark:text-slate-400`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {isEmpty ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                children
              )}
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                colSpan={columns.length}
              />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
