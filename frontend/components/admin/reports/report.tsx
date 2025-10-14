"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { Report } from "./reports";
import { toast } from "sonner";
import { deleteReport } from "@/lib/actions";
import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";

export function ReportBlock({ report }: { report: Report }) {
  const handleDeleteReport = async (reportId: string) => {
    const response = await deleteReport(reportId);
    if (response && !response.error) {
      toast.success("Report removed");
    } else {
      toast.error("Failed to remove report");
    }
  };

  // State variables for description expansion and clamping
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isTextClamped, setIsTextClamped] = useState(false);
  const [isScreenChanged, setIsScreenChanged] = useState(false); // New state variable to track screen size changes
  const textRef = useRef(null);

  // Stripping HTML tags and converting <p> and <br> to new lines
  const strippedDescription = report.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  useEffect(() => {
    if (textRef.current && strippedDescription) {
      const element = textRef.current as HTMLParagraphElement;
      const isClamped = element.scrollHeight > element.clientHeight;
      setIsTextClamped(isClamped);
    }
  }, [strippedDescription, descriptionExpanded]);

  // Effect to handle screen size changes and re-evaluate clamping
  useEffect(() => {
    const handleResize = () => {
      setIsScreenChanged(true);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isScreenChanged) {
      // Re-evaluate clamping only if the screen size has changed
      if (textRef.current && strippedDescription) {
        const element = textRef.current as HTMLParagraphElement;
        const isClamped = element.scrollHeight > element.clientHeight;
        setIsTextClamped(isClamped);
      }
      setIsScreenChanged(false); // Reset the flag after handling
    }
  }, [isScreenChanged, strippedDescription, descriptionExpanded]);

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-slate-900 dark:text-white">
            <span className="font-bold dark:text-slate-300">
              {report.fullName} &middot; {report.email} ({report.type})
            </span>
          </p>

          {strippedDescription &&
            strippedDescription.trim() !== "<p></p>" &&
            strippedDescription.trim() !== "" && (
              <div className="mt-2">
                <p
                  ref={textRef}
                  className={`${
                    descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                  } text-md text-slate-700 dark:text-slate-300`}
                >
                  {strippedDescription}
                </p>

                {isTextClamped && !descriptionExpanded && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDescriptionExpanded(true);
                    }}
                    className="mt-1 text-left text-sm text-sky-700 dark:text-sky-500"
                  >
                    See More
                  </button>
                )}

                {descriptionExpanded && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDescriptionExpanded(false);
                    }}
                    className="mt-1 text-left text-sm text-sky-700 dark:text-sky-500"
                  >
                    See Less
                  </button>
                )}
              </div>
            )}

          <p className="mt-2 truncate font-medium text-slate-900 dark:text-slate-300">
            Path: {report.path}
          </p>
          {report.time && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Reported on: {DateTime.fromISO(report.time).toFormat('MM-dd-yyyy h:mm a')}
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
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
