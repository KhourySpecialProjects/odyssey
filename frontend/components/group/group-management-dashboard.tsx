"use client";

import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import { ContentSection } from "@/components/group/content-section";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { Group } from "@/types";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";

interface RenderGroupDashboardProps {
  group: Group;
  canEdit: boolean | undefined;
}

const tabStyle =
  "px-4 py-2 cursor-pointer border-b-2 border-transparent focus:outline-none hover:border-gray-300";

export function GroupDashboard({ group, canEdit }: RenderGroupDashboardProps) {
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.droplets.map((droplet) => (
                <GroupDropletTile key={droplet.id} droplet={droplet} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
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
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
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
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                No droplets or members have been added to this group yet.
              </div>
            )}
          </ContentSection>
        </TabPanel>
      )}
    </Tabs>
  );
}
