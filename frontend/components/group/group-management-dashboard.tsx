"use client";

import { ContentSection } from "@/components/group/content-section";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { AuthorizedUser, DueDate, Group } from "@/types";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { VoyageCard } from "@/components/voyages/voyage-card";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface RenderGroupDashboardProps {
  group: Group;
  canEdit: boolean | undefined;
  authUser: AuthorizedUser;
  dueDates: DueDate[];
  statuses: Record<
    string,
    { completionPercentage: number; completionDate: Date | undefined }
  >;
}

export function GroupDashboard({
  group,
  canEdit,
  authUser,
  dueDates,
  statuses,
}: RenderGroupDashboardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const lessonsPerPage = 6;

  const startIndex = currentPage * lessonsPerPage;
  const endIndex = startIndex + lessonsPerPage;
  const paginatedDroplets = group.droplets?.slice(startIndex, endIndex);

  const totalPages = Math.ceil((group.droplets?.length || 0) / lessonsPerPage);
  const isAdmin = group.admins?.some((admin) => admin.id === authUser.id);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const hasVoyages = group.voyages && group.voyages.length > 0;
  const canViewProgress = canEdit || isAdmin;
  const tabNames = [
    "droplets",
    "playlists",
    ...(hasVoyages ? ["voyages"] : []),
    ...(canViewProgress ? ["progress"] : []),
  ];

  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");

  // Calculate selected index directly from URL
  const selectedIndex = (() => {
    const index = tabNames.indexOf(tabParam || "droplets");
    return index >= 0 ? index : 0;
  })();

  // Track which tabs have been visited - initialize with current tab from URL
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(
    new Set([selectedIndex]),
  );

  // Update visited tabs when URL changes
  useEffect(() => {
    setVisitedTabs((prev) => new Set(prev).add(selectedIndex));
  }, [selectedIndex]);

  const handleTabSelect = (index: number) => {
    setVisitedTabs((prev) => new Set(prev).add(index));
    const tabName = tabNames[index];
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabName);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {tabNames.map((tabName, index) => {
          const label = tabName.charAt(0).toUpperCase() + tabName.slice(1);
          return (
            <button
              key={tabName}
              onClick={() => handleTabSelect(index)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                selectedIndex === index
                  ? "border-[#287697] bg-[#287697] text-white"
                  : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tabNames[selectedIndex] === "droplets" && (
        <ContentSection
          title=""
          emptyMessage="No droplets have been added to this group yet."
        >
          {group.droplets && group.droplets.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                {paginatedDroplets?.map((droplet) => (
                  <div key={droplet.id} className="h-full w-full">
                    <GroupDropletTile
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
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className={cn(
                    currentPage === 0
                      ? "invisible"
                      : "visible dark:bg-slate-300 dark:text-black",
                  )}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className={cn(
                    currentPage === totalPages - 1
                      ? "invisible"
                      : "visible dark:bg-slate-300 dark:text-black",
                  )}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-slate-500 dark:border-slate-500 dark:text-slate-300">
              No droplets have been added to this group yet.
            </div>
          )}
        </ContentSection>
      )}

      {tabNames[selectedIndex] === "playlists" &&
        visitedTabs.has(selectedIndex) && (
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
                    dueDate={
                      dueDates?.find(
                        (dueDate) => dueDate.playlist?.id === playlist.id,
                      )?.dueDate || ""
                    }
                    timeZone={authUser.timeZone?.trim()}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500 dark:border-slate-500 dark:text-slate-300">
                No playlists have been added to this group yet.
              </div>
            )}
          </ContentSection>
        )}

      {tabNames[selectedIndex] === "voyages" &&
        visitedTabs.has(selectedIndex) && (
          <ContentSection
            title=""
            emptyMessage="No voyages have been added to this group yet."
          >
            {group.voyages && group.voyages.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.voyages.map((voyage) => (
                  <VoyageCard key={voyage.id} voyage={voyage} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500 dark:border-slate-500 dark:text-slate-300">
                No voyages have been added to this group yet.
              </div>
            )}
          </ContentSection>
        )}

      {tabNames[selectedIndex] === "progress" &&
        visitedTabs.has(selectedIndex) && (
          <ContentSection
            title=""
            emptyMessage="No students are enrolled in any droplets or playlists."
          >
            {((group.droplets && group.droplets.length > 0) ||
              (group.playlists && group.playlists.length > 0)) &&
            group.members &&
            group.members.length > 0 ? (
              <div className="flex flex-row items-start overflow-x-auto">
                <div key={group.id}>
                  <GroupProgressGrid group={group} statuses={statuses} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500 dark:border-slate-500 dark:text-slate-300">
                No droplets or members have been added to this group yet.
              </div>
            )}
          </ContentSection>
        )}
    </div>
  );
}
