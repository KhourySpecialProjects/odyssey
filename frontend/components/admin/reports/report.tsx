"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import { Report } from "./reports";

export function ReportBlock({ report }: { report: Report }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="truncate text-slate-900 dark:text-white">
            <span className="font-bold">
              {report.fullName} &middot; {report.email} ({report.type})
            </span>
          </p>
          <div className="mt-0.5 inline-flex gap-1 items-center text-slate-600">
            <LinkIcon className="w-4 h-4" />
            <span className="text-sm">{report.path}</span>
          </div>

          <p className="mt-2 font-medium truncate text-slate-900 dark:text-white">
            {report.description}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Button after={<ArrowRightIcon />} asChild>
            <Link href={report.path} target="_blank">
              Visit Reported Page
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
