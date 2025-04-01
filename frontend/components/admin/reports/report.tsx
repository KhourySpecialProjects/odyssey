"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Report } from "./reports";
import { toast } from "sonner";
import { deleteReport } from "@/lib/actions";

export function ReportBlock({ report }: { report: Report }) {
  const handleDeleteReport = async (reportId: string) => {
    const response = await deleteReport(reportId);
    if (response && !response.error) {
      toast.success("Report removed");
    } else {
      toast.error("Failed to remove report");
    }
  };

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
          <p className="mt-2 font-medium truncate text-slate-900 dark:text-slate-300">
            Path: {report.path}
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
          <Button
            className="bg-red-600 dark:bg-red-300"
            onClick={() => handleDeleteReport(report.id)}
            title="Delete Report"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </li>
  );
}
