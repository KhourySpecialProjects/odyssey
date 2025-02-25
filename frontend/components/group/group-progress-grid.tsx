"use client";

import "react-tabs/style/react-tabs.css";
import { ContentSection } from "@/components/group/content-section";
import { Droplet } from "@/types";
import { Playlist } from "@/types";
import { AuthorizedUser } from "@/types";
import React, { useTransition } from "react";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { MoveLeft, MoveRight } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";

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
}

export function GroupProgressGrid({ group }: GroupProgressGridProps) {
  // const [completionStatus, setCompletionStatus] = useState<
  //   Record<string, boolean>
  // >({});

  const [completionStatus, setCompletionStatus] = useState<
    Record<string, number>
  >({});

  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(0); // Track the current page
  const lessonsPerPage = 4; // Number of lessons to show per page

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

  useEffect(() => {
    const fetchCompletionStatuses = async () => {
      const statuses: Record<string, boolean> = {};

      try {
        await Promise.all(
          (group.members || []).map(async (member) => {
            startTransition(async () => {
              const enrollments = await getEnrollmentsByAuthorizedUser(
                member.id,
              );

              const completedLessonIds = enrollments.flatMap(
                (enrollment) =>
                  enrollment.viewedLessons?.map((lesson) => lesson.id) || [],
              );

              enrollments.map(async (enrollment) => {
                const completedLessons =
                  enrollment.viewedLessons?.map((lesson) => lesson.id) || [];
                const dropletLessons = enrollment.droplet.lessons?.length || 1;
                const percentCompleted =
                  (completedLessons?.length / dropletLessons) * 100 || 0;

                setCompletionStatus((prev) => ({
                  ...prev,
                  [`${member.id}-${enrollment.droplet.id}`]: percentCompleted,
                }));
              });
            });
          }),
        );
      } catch (error) {
        console.error("Error fetching completion statuses:", error);
      }
    };

    fetchCompletionStatuses();
  }, [group]);

  const getCompletionStatus = (memberId: number, dropletId: number) => {
    return completionStatus[`${memberId}-${dropletId}`] || 0;
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

  return (
    <div className="flex flex-col items-end">
      {/* Navigation Buttons */}
      <div className="">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className={`px-4 py-2 mr-4 w-22 ${currentPage === 0 ? "visibility: hidden" : "visibility: visible"}`}
        >
          <MoveLeft />
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages - 1}
          className={`px-4 py-2 ${currentPage >= totalPages - 1 ? "visibility: hidden" : "visibility: visible"}`}
        >
          <MoveRight />
        </button>
      </div>

      <ContentSection title="">
        {group.droplets && group.droplets.length > 0 ? (
          <div className="flex flex-row justify-start">
            <div className="flex flex-col justify-self-start">
              <div className="transition-colors border-slate-200 hover:border-slate-300 bg-white-50 p-4 h-24 w-55 flex items-center justify-center">
                <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                  {""}
                </span>
              </div>

              {group.members?.map((member) => (
                <div
                  key={member.id}
                  className="transition-colors  border-slate-200 hover:border-slate-300 bg-white-50 p-4 h-24 w-55 flex items-center justify-center"
                >
                  <span
                    title={member.email}
                    className="text-center text-sm font-semibold text-slate-950 line-clamp-3"
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
                {paginatedLessons?.map((droplet, rowIndex) => (
                  <div
                    key={droplet.id}
                    className="transition-colors  border-slate-200 hover:border-slate-300 bg-white-50 p-4 h-24 w-36 flex items-center justify-center"
                  >
                    <span
                      title={droplet.name}
                      className="text-center text-sm font-semibold text-slate-950 line-clamp-3"
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
                  <div className="" key={droplet.id * group.id}>
                    {group.members?.map((member) => (
                      <div
                        key={member.id * droplet.id * 100}
                        className="transition-colors border border-slate-200 hover:border-slate-300 bg-white-50 p-4 h-24 w-36 flex items-center justify-center"
                      >
                        <div
                          title={
                            getCompletionStatus(member.id, droplet.id) + "%"
                          }
                          style={{
                            width: "100%",
                            height: "30px",
                            backgroundColor: "#e4e5e9",
                            borderRadius: "5px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${getCompletionStatus(member.id, droplet.id)}%`, // Set width based on the percentage
                              height: "100%",
                              backgroundColor: getCompletedDropletColor(
                                getCompletionStatus(member.id, droplet.id),
                              ),
                              transition: "width 0.3s ease", // Smooth transition
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
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
            No droplets have been added to this group yet.
          </div>
        )}
      </ContentSection>
    </div>
  );
}
