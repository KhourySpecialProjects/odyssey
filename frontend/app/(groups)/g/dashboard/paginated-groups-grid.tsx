"use client";

import { useState } from "react";
import { Group } from "@/types";
import { GroupCard } from "@/components/group/group-card";
import { AdminPagination } from "@/components/admin/admin-pagination";

/** 3 columns x 4 rows at the lg breakpoint. */
const GROUPS_PER_PAGE = 12;

type GroupWithRole = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
};

type Props = {
  groups: GroupWithRole[];
  roleColors: Record<string, string>;
};

export function PaginatedGroupsGrid({ groups, roleColors }: Props) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  // Clamp so a shrinking list can never strand the view on an empty page.
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safePage - 1) * GROUPS_PER_PAGE;
  const visibleGroups = groups.slice(startIndex, startIndex + GROUPS_PER_PAGE);

  return (
    <>
      <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleGroups.map(({ group, role }) => (
          <div key={`group-${group.id}`} className="h-full">
            <GroupCard
              group={group}
              role={role}
              roleColors={roleColors}
              isArchived={false}
              dashboardPage={false}
            />
          </div>
        ))}
      </div>
      <AdminPagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        variant="standalone"
      />
    </>
  );
}
