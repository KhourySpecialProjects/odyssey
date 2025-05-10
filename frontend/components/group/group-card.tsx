"use client";

import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Archive, ArchiveRestore, UsersIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { archiveGroup } from "@/lib/actions";

type GroupCardProps = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
  roleColors?: Record<string, string>;
  isArchived: boolean;
};

export function GroupCard({
  group,
  role,
  roleColors,
  isArchived,
}: GroupCardProps) {
  async function changeVisibility() {
    try {
      const result = await archiveGroup(group, isArchived ? false : true);
      if (result.success) {
        toast.success(
          isArchived
            ? `${group.groupName} is now unarchived!`
            : `${group.groupName} is now archived!`,
        );
      } else {
        toast.error("Failed to update group visibility");
      }
    } catch (error) {
      toast.error("An error occurred while updating the group");
      console.error(error);
    }
  }

  return (
    <Link
      href={`/g/${group.slug}`}
      className="inline-block h-full w-full rounded-md border border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="p-2 transition-colors">
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            changeVisibility();
          }}
          className={`${isArchived === true || isArchived === false ? "visibility: visible" : "visibility: hidden"} bg-white hover:bg-slate-300 dark:bg-slate-300`}
        >
          <div className="group relative">
            {isArchived ? (
              <ArchiveRestore className="text-purple-800" />
            ) : (
              <Archive className="text-purple-800" />
            )}
            <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isArchived ? "Unarchive" : "Archive"}
            </span>
          </div>
        </Button>

        <div className="flex h-full flex-col rounded-md bg-slate-50 p-6 dark:bg-slate-800">
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-950 dark:text-slate-300">
                {group.groupName}
              </h3>
              <Badge
                className={
                  roleColors
                    ? roleColors[role]
                    : "bg-green-100 text-green-800 hover:bg-green-100 dark:hover:bg-green-100"
                }
              >
                {role}
              </Badge>
            </div>
          </div>
          <div>
            {(role === "creator" || role === "admin" || role === "manager") && (
              <div className="light:text-slate-600 flex items-center gap-4 text-sm dark:text-slate-300">
                <UsersIcon className="h-4 w-4" />
                <div className="flex gap-3">
                  <span>Admins: {group.admins?.length || 0}</span>
                  <span>Managers: {group.managers?.length || 0}</span>
                  <span>Members: {group.members?.length || 0}</span>
                </div>
              </div>
            )}
            {!(
              role === "creator" ||
              role === "admin" ||
              role === "manager"
            ) && (
              <div className="light:text-slate-600 pt-2 text-sm dark:text-slate-300">
                <div className="flex gap-3">
                  <span>Members: {group.members?.length || 0}</span>
                </div>
                <div className="light:text-slate-600 pt-2 text-sm dark:text-slate-300">
                  Creator:{" "}
                  {group.creator.firstName && group.creator.lastName
                    ? group.creator?.firstName + " " + group.creator?.lastName
                    : group.creator.email}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
