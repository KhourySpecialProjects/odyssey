"use client";
import { Group } from "@/types";
import { GroupCard } from "../group/group-card";
import { useSearch } from "@/contexts/SearchContext";
import { useMemo } from "react";

export function UserGroups({
  activeGroups,
  isArchived,
  sortKey,
}: {
  activeGroups: Group[];
  isArchived: boolean;
  sortKey?: string;
}) {
  const { searchQuery } = useSearch();
  const filteredGroups = useMemo(() => {
    return activeGroups.filter((group) =>
      group.groupName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [activeGroups, searchQuery]);

  if (sortKey) {
    const [field, direction] = sortKey.split(":");
    if (field === "name") {
      filteredGroups?.sort((a, b) => {
        return direction === "asc"
          ? a.groupName.localeCompare(b.groupName)
          : b.groupName.localeCompare(a.groupName);
      });
    }
  }

  return (
    <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredGroups.map((group) => (
        <div key={`group-${group.id}`} className="h-full pb-2">
          <GroupCard
            key={group.id}
            group={group}
            role={"member"}
            isArchived={isArchived}
            dashboardPage={true}
          />
        </div>
      ))}
    </div>
  );
}
