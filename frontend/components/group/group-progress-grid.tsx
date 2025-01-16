"use client";

import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { ContentSection } from "@/components/group/content-section";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { Droplet } from "@/types";
import { Group } from "@/types";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { Enrollment } from "@/types";
import { Playlist } from "@/types";
import { AuthorizedUser } from "@/types";
import React, { useTransition } from "react";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getIsEnrollComplete, getIsEnrolled } from "@/lib/requests/enrollment";
import { CheckCircle2 } from "lucide-react";
import { XCircle } from "lucide-react";
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
  const [completionStatus, setCompletionStatus] = useState<
    Record<string, boolean>
  >({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchCompletionStatuses = async () => {
      const statuses: Record<string, boolean> = {};

      try {
        await Promise.all(
          (group.members || []).map(async (member) => {
            await Promise.all(
              (group.droplets || []).map(async (droplet) => {
                const key = `${member.id}-${droplet.id}`;
                startTransition(async () => {
                  const isComplete = await getIsEnrollComplete(
                    member.id,
                    droplet.id
                  );
                  setCompletionStatus((prev) => ({
                    ...prev,
                    [key]: isComplete,
                  }));
                });
              })
            );
          })
        );
      } catch (error) {
        console.error("Error fetching completion statuses:", error);
      }
    };

    fetchCompletionStatuses();
  }, [group]);

  const getCompletionStatus = (memberId: number, dropletId: number) => {
    return completionStatus[`${memberId}-${dropletId}`] || false;
  };

  return (
    <ContentSection title="">
      {group.droplets && group.droplets.length > 0 ? (
        <div className="flex flex-row justify-start">
          <div className="flex flex-col justify-self-start">
            <div className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-55 flex items-center justify-center">
              <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                {""}
              </span>
            </div>

            {group.members?.map((member) => (
              <div
                key={member.id}
                className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-55 flex items-center justify-center"
              >
                <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                  {member.email}
                </span>
              </div>
            ))}
          </div>

          <div>
            <div className="flex flex-row">
              {group.droplets.map((droplet) => (
                <div
                  key={droplet.id}
                  className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-36 flex items-center justify-center"
                >
                  <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                    {droplet.name}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="grid grid-flow-row gap-0"
              style={{
                gridTemplateColumns: `repeat(${group.droplets?.length || 1}, minmax(0, 1fr))`,
              }}
            >
              {group.droplets?.map((droplet) => (
                <div className="" key={droplet.id * group.id}>
                  {group.members?.map((member) => (
                    <div
                      key={member.id * droplet.id * 100}
                      className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-36 flex items-center justify-center"
                    >
                      <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                        {getCompletionStatus(member.id, droplet.id) === true
                          ? "X"
                          : "O"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
          No playlists have been added to this group yet.
        </div>
      )}
    </ContentSection>
  );
}

/**export function GroupProgressGrid({ group }: GroupProgressGridProps) {

{getCompletionStatus(member.id, droplet.id) === true ?
                                                    "X" :
                                                    "O"}



    return (

        <ContentSection
            title="">

            {group.droplets && group.droplets.length > 0 ? (
                <div className="flex flex-row items-start h-full">
                    {group.droplets.map((droplet) => (
                        <div className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 w-50">
                            <span className="block w-full text-s font-black text-slate-950 place-self-end">
                                {droplet.name}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                    No playlists have been added to this group yet.
                </div>
            )}


        </ContentSection>
    )



} 








<ContentSection title="">
                {group.droplets && group.droplets.length > 0 ? (
                    <div className="flex flex-row justify-start">

                        <div className="flex flex-col justify-self-start">

                            <div

                                className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-55 flex items-center justify-center"
                            >
                                <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                                    {""}
                                </span>
                            </div>


                            {group.members?.map((member) => (
                                <div
                                    key={member.id}
                                    className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-55 flex items-center justify-center"
                                >
                                    <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                                        {member.email}
                                    </span>
                                </div>
                            ))}
                        </div>


                        <div>
                            <div className="flex flex-row">
                                {group.droplets.map((droplet) => (
                                    <div
                                        key={droplet.id}
                                        className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-36 flex items-center justify-center"
                                    >
                                        <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                                            {droplet.name}
                                        </span>
                                    </div>
                                ))}
                            </div>



                            <div
                                className="grid grid-flow-row gap-0"
                                style={{
                                    gridTemplateColumns: `repeat(${group.droplets?.length || 1}, minmax(0, 1fr))`
                                }}
                            >
                                {group.members?.map((member) => (
                                    <div className=""
                                        key={member.id * group.id}>
                                        {group.droplets?.map((droplet) => (
                                            <div
                                                key={member.id * droplet.id * 100}
                                                className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 p-4 h-24 w-36 flex items-center justify-center"
                                            >
                                                <span className="text-center text-sm font-semibold text-slate-950 line-clamp-3">
                                                    {getCompletionStatus(member.id, droplet.id) === true ?
                                                        "X" :
                                                        "O"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                            </div>
                        </div>




                    </div>





                ) : (
                    <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                        No playlists have been added to this group yet.
                    </div>
                )}
            </ContentSection>

*/
