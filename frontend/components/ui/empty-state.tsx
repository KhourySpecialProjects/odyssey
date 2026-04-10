import { type ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#D0D5DD] py-16 text-center dark:border-slate-600">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
        {icon}
      </div>
      <p className="text-base font-medium text-black dark:text-white">
        {title}
      </p>
      <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}
