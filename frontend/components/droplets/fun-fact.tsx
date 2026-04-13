import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Droplet } from "@/types";

const outlineLinkCls =
  "inline-flex items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] py-[10px] text-sm font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

export function FunFact({ droplet }: { droplet: Droplet }) {
  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-lg border border-slate-200 bg-slate-50 p-8 dark:border-slate-500 dark:bg-slate-800">
      <div className="w-full">
        <strong className="text-2xl text-black dark:text-slate-300">
          Did you know?
        </strong>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          {droplet?.funFact}
        </p>
      </div>
      <Link
        href={`/d/${droplet.slug}`}
        className={`${outlineLinkCls} w-full justify-between`}
      >
        <span>
          Dive deeper in <strong>{droplet.name}</strong>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  );
}
