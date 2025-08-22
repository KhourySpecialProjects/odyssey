"use client";

import "react-tabs/style/react-tabs.css";
import { ContentSection } from "@/components/group/content-section";
import { Droplet } from "@/types";
import { Playlist } from "@/types";
import { AuthorizedUser } from "@/types";
import React from "react";
import { FileSpreadsheet, MoveLeft, MoveRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import * as XLSX from "xlsx-js-style";
import { toast } from "sonner";

interface GroupProgressGridProps {
  group: {
    id: number;
    groupName: string;
    slug: string;
    description?: string;
    isArchived: boolean;
    members?: AuthorizedUser[];
    droplets?: Droplet[];
    playlists?: Playlist[];
  };
  statuses: Record<string, number>;
}

export function GroupProgressGrid({ group, statuses }: GroupProgressGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const lessonsPerPage = 4;

  const startIndex = currentPage * lessonsPerPage;
  const endIndex = startIndex + lessonsPerPage;
  const paginatedLessons = group.droplets?.slice(startIndex, endIndex);

  const totalPages = Math.ceil((group.droplets?.length || 0) / lessonsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  let sortedMembers: AuthorizedUser[] = [];

  if (group.members) {
    sortedMembers = [...group.members].sort((a, b) => {
      const aValue = a.lastName || a.email;
      const bValue = b.lastName || b.email;
      return aValue.localeCompare(bValue);
    });
  }

  const getCompletionStatus = (memberId: number, dropletId: number) => {
    return Math.floor(statuses[`${memberId}-${dropletId}`] * 100) / 100 || 0;
  };

  const getCompletedDropletColor = (completionStatus: number) => {
    if (completionStatus === 100) return "#6EE7B7";
    else if (completionStatus > 33) {
      return "#FBBF24";
    }
    if (completionStatus <= 33) return "#EF4444";
    if (completionStatus == 0) {
      return "#FFFFFF";
    } else {
      return "#e4e5e9";
    }
  };

  const exportGridToExcel = () => {
    try {
      if (group.droplets && sortedMembers) {
        const headers = group.droplets.map(
          (droplet) => `${droplet.name} (${droplet.id})`,
        );
        const rows = sortedMembers.map((member) => {
          const row = group.droplets!.map((droplet) =>
            getCompletionStatus(member.id, droplet.id),
          );
          const memberName =
            member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : "N/A";
          return [member.email, memberName, ...row];
        });

        const curDate = new Date();
        // Format hours and minutes with leading zeros
        const hours = curDate.getHours().toString().padStart(2, "0");
        const minutes = curDate.getMinutes().toString().padStart(2, "0");

        const data = [
          [
            `Recorded on: ${curDate.getMonth() + 1}/${curDate.getDate()}/${curDate.getFullYear()} ${hours}:${minutes}`,
            "",
            ...headers,
          ],
          ...rows,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Highlight specific values
        const range = XLSX.utils.decode_range(worksheet["!ref"]!);
        for (let R = 1; R <= range.e.r; ++R) {
          // skip header row
          for (let C = 2; C <= range.e.c; ++C) {
            // skip "Member" column
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress];
            if (!cell || typeof cell.v !== "number") continue;

            const value = cell.v;
            if (value === 100) {
              cell.s = {
                fill: {
                  fgColor: { rgb: "90EE90" }, // light green background
                },
                font: {
                  bold: true,
                },
              };
            } else if (value >= 0 && value <= 33) {
              cell.s = {
                fill: {
                  fgColor: { rgb: "FFCCCC" }, // light red background
                },
                font: {
                  bold: true,
                },
              };
            } else if (value > 33 && value < 100) {
              cell.s = {
                fill: {
                  fgColor: { rgb: "FFFFCC" }, // light yellow background
                },
                font: {
                  bold: true,
                },
              };
            }
          }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Progress");
        XLSX.writeFile(
          workbook,
          `${group.groupName.replace(/ /g, "_")}_progress_report_${curDate.getMonth() + 1}_${curDate.getDate()}_${curDate.getFullYear()}.xlsx`,
        );
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export group progress");
    }
  };

  return (
    <div className="flex flex-col items-end">
      <div className="flex w-full flex-row justify-between">
        <Button
          className="border dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:text-slate-800"
          onClick={exportGridToExcel}
        >
          <FileSpreadsheet />
          Download as Excel
        </Button>
        <div className="">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`mr-4 w-22 px-4 py-2 ${currentPage === 0 ? "visibility: hidden" : "visibility: visible"}`}
          >
            <MoveLeft />
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            aria-label="Next page"
            className={`px-4 py-2 ${currentPage >= totalPages - 1 ? "visibility: hidden" : "visibility: visible"}`}
          >
            <MoveRight />
          </button>
        </div>
      </div>
      <ContentSection title="">
        {group.droplets && group.droplets.length > 0 ? (
          <div className="flex flex-row justify-start">
            <div className="flex flex-col justify-self-start">
              <div className="bg-white-50 flex h-24 w-55 items-center justify-center border-slate-200 p-4 transition-colors hover:border-slate-300">
                <span className="line-clamp-3 text-center text-sm font-semibold text-slate-950">
                  {""}
                </span>
              </div>

              {sortedMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white-50 flex h-24 w-55 items-center justify-center border-slate-200 p-4 transition-colors hover:border-slate-300"
                >
                  <span
                    title={member.email}
                    className="line-clamp-3 text-center text-sm font-semibold text-slate-950 dark:text-slate-300"
                  >
                    {member.firstName || member.lastName
                      ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
                      : member.email}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex flex-row">
                {paginatedLessons?.map((droplet) => (
                  <div
                    key={droplet.id}
                    className="bg-white-50 flex h-24 w-36 items-center justify-center border-slate-200 p-4 transition-colors hover:border-slate-300"
                  >
                    <span
                      title={droplet.name}
                      className="line-clamp-3 text-center text-sm font-semibold text-slate-950 dark:text-slate-300"
                    >
                      {droplet.name}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="grid grid-flow-row gap-0"
                style={{
                  gridTemplateColumns: `repeat(${paginatedLessons?.length || 1}, minmax(0, 1fr))`,
                }}
              >
                {paginatedLessons?.map((droplet) => (
                  <div
                    className=""
                    key={`group-${group.id}-droplet-${droplet.id}`}
                  >
                    {sortedMembers.map((member) => (
                      <div
                        key={`member-${group.id}-droplet-${droplet.id}`}
                        className="bg-white-50 flex h-24 w-36 items-center justify-center border border-slate-200 p-4 transition-colors hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                      >
                        <div
                          title={
                            getCompletionStatus(member.id, droplet.id) + "%"
                          }
                          style={{
                            width: "100%",
                            height: "30px",

                            borderRadius: "5px",
                            overflow: "hidden",
                          }}
                          className="bg-[#e4e5e9] dark:bg-slate-500"
                        >
                          <div
                            style={{
                              width: `${getCompletionStatus(member.id, droplet.id)}%`,
                              height: "100%",
                              backgroundColor: getCompletedDropletColor(
                                getCompletionStatus(member.id, droplet.id),
                              ),
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
            No droplets have been added to this group yet.
          </div>
        )}
      </ContentSection>
    </div>
  );
}
