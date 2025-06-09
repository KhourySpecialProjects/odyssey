"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import {
  Droplet,
  Handshake,
  ListVideo,
  PartyPopper,
  UsersRound,
  Info,
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";

interface FeedFilterProps {
  onFilterChange: (selectedRoles: AnnouncementTypeTitle[]) => void;
}

export function FeedFilter({ onFilterChange }: FeedFilterProps) {
  const roleOptions = [
    {
      value: AnnouncementTypeTitle.Droplet,
      label: (
        <>
          <span role="droplet">Droplet</span>
          <Droplet size={20} />
        </>
      ),
      color: "bg-blue-200 dark:bg-blue-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Playlist,
      label: (
        <>
          <span role="playlist">Playlist</span>
          <ListVideo size={20} />
        </>
      ),
      color: "bg-green-200 dark:bg-green-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Group,
      label: (
        <>
          <span role="group">Group</span> <UsersRound size={20} />
        </>
      ),
      color: "bg-purple-200 dark:bg-purple-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.System,
      label: (
        <>
          <span role="system">System</span> <Info size={20} />
        </>
      ),
      color: "bg-red-200 dark:bg-red-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Friend,
      label: (
        <>
          <span role="friend">Friend</span> <Handshake size={20} />
        </>
      ),
      color: "bg-yellow-200 dark:bg-yellow-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Kudos,
      label: (
        <>
          <span role="kudos">Kudos</span> <PartyPopper size={20} />
        </>
      ),
      color: "bg-orange-200 dark:bg-orange-800 dark:text-slate-300",
    },
  ] as const;

  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    roleOptions.map((role) => role.value),
  );

  const toggleRole = (role: AnnouncementTypeTitle) => {
    const newSelectedRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];

    setSelectedRoles(newSelectedRoles);
    onFilterChange(newSelectedRoles);
  };

  return (
    <div className="space-y-3 py-4 md:bg-slate-50 md:border md:border-slate-200 md:rounded-md">
      {roleOptions.map((role) => (
        <div
          key={role.value}
          className={`flex items-center space-x-2 rounded-md p-1 ${role.color} mx-4 scale-110`}
        >
          <Checkbox
            id={role.value}
            checked={selectedRoles.includes(role.value)}
            onCheckedChange={() => toggleRole(role.value)}
            className="border-sky-500 bg-sky-200 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500 dark:data-[state=checked]:bg-sky-500"
          />
          <div
            className={`${selectedRoles.includes(role.value) ? "opacity-100" : "opacity-50"} w-[90px] pl-1 focus-visible:ring-sky-500`}
          >
            <span className="flex w-full items-center justify-between gap-1 px-1 text-sm leading-none font-medium">
              {role.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
