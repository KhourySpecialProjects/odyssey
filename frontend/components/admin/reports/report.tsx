"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Report } from "./reports";

export function ReportBlock({ report }: { report: Report }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="truncate text-slate-900 dark:text-white">
            <span className="font-bold dark:text-slate-300">
              {report.fullName} &middot; {report.email} ({report.type})
            </span>
          </p>

          <p className="mt-2 font-medium truncate text-slate-900 dark:text-slate-300">
            {report.description}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Button
            after={<ArrowRightIcon />}
            className="dark:bg-slate-300"
            asChild
          >
            <Link href={report.path} target="_blank">
              Visit Reported Page
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
