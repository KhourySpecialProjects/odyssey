"use client";

import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import { ContentSection } from "@/components/group/content-section";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { AuthorizedUser, DueDate, Group } from "@/types";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";
import { Button } from "../ui/button";
import { useState } from "react";

interface RenderGroupDashboardProps {
  group: Group;
  canEdit: boolean | undefined;
  authUser: AuthorizedUser;
  dueDates: DueDate[];
}

const tabStyle =
  "px-4 py-2 cursor-pointer border-b-2 border-transparent focus:outline-none hover:border-gray-300";

export function GroupDashboard({ group, canEdit, authUser, dueDates }: RenderGroupDashboardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const lessonsPerPage = 6;

  const startIndex = currentPage * lessonsPerPage;
  const endIndex = startIndex + lessonsPerPage;
  const paginatedDroplets = group.droplets?.slice(startIndex, endIndex);

  const totalPages = Math.ceil((group.droplets?.length || 0) / lessonsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  return (
    <Tabs title="" forceRenderTabPanel>
      <TabList className="flex border-b">
        <Tab className={tabStyle}>Droplets</Tab>
        <Tab className={tabStyle}>Playlists</Tab>
        {canEdit && <Tab className={tabStyle}>Progress</Tab>}
      </TabList>
      <TabPanel>
        <ContentSection
          title=""
          emptyMessage="No droplets have been added to this group yet."
        >
          {/* Droplet components will go here */}
          {group.droplets && group.droplets.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
                {paginatedDroplets?.map((droplet) => (
                  <div key={droplet.id} className="h-full w-full">
                    <GroupDropletTile
                  key={droplet.id}
                  droplet={droplet}
                  dueDate={
                    dueDates?.find(
                      (dueDate) => dueDate.droplet?.id === droplet.id,
                    )?.dueDate || ""
                  }
                  authUser={authUser}
                />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className={`${currentPage === 0 ? "visibility: hidden" : "visibility: visible"} dark:bg-slate-300 dark:text-black`}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className={`${currentPage === totalPages - 1 ? "visibility: hidden" : "visibility: visible"} dark:bg-slate-300 dark:text-black`}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-300 border border-dashed dark:border-slate-500 rounded-lg">
              No droplets have been added to this group yet.
            </div>
          )}
        </ContentSection>
      </TabPanel>
      <TabPanel>
        <ContentSection
          title=""
          emptyMessage="No playlists have been added to this group yet."
        >
          {group.playlists && group.playlists.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  completedLessonIds={[]} // We'll need to implement this later
                  dueDate={
                    dueDates?.find(
                      (dueDate) => dueDate.playlist?.id === playlist.id,
                    )?.dueDate || ""
                  }
                  timeZone={authUser.timeZone}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg dark:text-slate-300 dark:border-slate-500">
              No playlists have been added to this group yet.
            </div>
          )}
        </ContentSection>
      </TabPanel>
      {canEdit && (
        <TabPanel>
          <ContentSection
            title=""
            emptyMessage="No students are enrolled in any droplets or playlists."
          >
            {group.droplets &&
            group.droplets.length > 0 &&
            group.members &&
            group.members.length > 0 ? (
              <div className="flex flex-row items-start">
                <div className="" key={group.id}>
                  <GroupProgressGrid group={group} />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg dark:text-slate-300 dark:border-slate-500">
                No droplets or members have been added to this group yet.
              </div>
            )}
          </ContentSection>
        </TabPanel>
      )}
    </Tabs>
  );
}
