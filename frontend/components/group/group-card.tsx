"use client"

import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Archive, ArchiveRestore, UsersIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { archiveGroup } from "@/lib/actions";

type GroupCardProps = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
  roleColors?: Record<string, string>;
  isArchived: boolean
};

export function GroupCard({ group, role, roleColors, isArchived }: GroupCardProps) {
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
    <div className="transition-colors border dark:bg-slate-800 rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300 bg-slate-50 h-full p-2">
      <Button
      size="sm"
      onClick={changeVisibility}
      className={`${isArchived === true || isArchived === false ? "visibility: visible" : "visibility: hidden"} bg-white dark:bg-slate-300 hover:bg-slate-300`}
    >
      <div className="relative group">
        {isArchived ? <ArchiveRestore className="text-purple-800" /> : <Archive className="text-purple-800" />}
        <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {isArchived ? "Unarchive" : "Archive"}
        </span>
      </div>
    </Button>
    <Link href={`/g/${group.slug}`} className="relative inline-block w-full p-6">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-md flex flex-col h-full">
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-slate-950 dark:text-slate-300">
              {group.groupName}
            </h3>
            <Badge className={roleColors ? roleColors[role] : "bg-green-100 text-green-800 dark:hover:bg-green-100 hover:bg-green-100"}>{role}</Badge>
          </div>
        </div>
        <div>
          {(role === "creator" || role === "admin" || role === "manager") && (
            <div className="flex items-center gap-4 text-sm light:text-slate-600 dark:text-slate-300">
              <UsersIcon className="h-4 w-4" />
              <div className="flex gap-3">
                <span>Admins: {group.admins?.length || 0}</span>
                <span>Managers: {group.managers?.length || 0}</span>
                <span>Members: {group.members?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
    </div>
  );
}
