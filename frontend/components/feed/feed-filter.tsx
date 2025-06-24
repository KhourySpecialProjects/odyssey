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

const backgroundColor = {
  playlist: "bg-green-200 dark:bg-[#29703B]",
  droplet: "bg-sky-200 dark:bg-[#266697]",
  group: "bg-purple-200 dark:bg-[#754ABA]",
  friend: "bg-yellow-200 dark:bg-[#977020]",
  kudos: "bg-orange-200 dark:bg-[#B55E0C]",
  system: "bg-red-200 dark:bg-[#B83028]",
};

export function FeedFilter({ onFilterChange }: FeedFilterProps) {
  const roleOptions = [
    {
      value: AnnouncementTypeTitle.Droplet,
      label: "Droplet",
      icon: <Droplet size={20} />,
      color: "bg-blue-200 dark:bg-[#266697] dark:text-slate-200",
    },
    {
      value: AnnouncementTypeTitle.Playlist,
      label: "Playlist",
      icon: <ListVideo size={20} />,
      color: "bg-green-200 dark:bg-[#29703B] dark:text-slate-200",
    },
    {
      value: AnnouncementTypeTitle.Group,
      label: "Group",
      icon: <UsersRound size={20} />,
      color: "bg-purple-200 dark:bg-[#754ABA] dark:text-slate-200",
    },
    {
      value: AnnouncementTypeTitle.System,
      label: "System",
      icon: <Info size={20} />,
      color: "bg-red-200 dark:bg-[#B83028] dark:text-slate-200",
    },
    {
      value: AnnouncementTypeTitle.Friend,
      label: "Friend",
      icon: <Handshake size={20} />,
      color: "bg-yellow-200 dark:bg-[#C38508] dark:text-slate-200",
    },
    {
      value: AnnouncementTypeTitle.Kudos,
      label: "Kudos",
      icon: <PartyPopper size={20} />,
      color: "bg-orange-200 dark:bg-[#B55E0C] dark:text-slate-200",
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
    <div className="p-4 min-w-[275px] grid sm:grid-cols-1 md:grid-cols-2 gap-3 md:rounded-md md:border md:border-slate-200 md:bg-slate-50 md:dark:border-slate-500 md:dark:bg-slate-800">
      {roleOptions.map((role) => (
        <div
          key={role.value}
          className={`flex justify-between items-center rounded-md p-2 ${role.color}`}
        >
          <Checkbox
            id={role.value}
            checked={selectedRoles.includes(role.value)}
            onCheckedChange={() => toggleRole(role.value)}
            className="border-sky-500 bg-sky-200 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500 dark:data-[state=checked]:bg-sky-500"
          />
          <span 
            className={`text-sm font-medium ${selectedRoles.includes(role.value) ? "opacity-100" : "opacity-50"}`}
          >
            {role.label}
          </span>
          <div className={`${selectedRoles.includes(role.value) ? "opacity-100" : "opacity-50"}`}>
            {role.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

{/*<div className="gap-2 gap-x-0 py-4 sm:grid sm:grid-cols-1 md:grid-cols-2 md:rounded-md md:border md:border-slate-200 md:bg-slate-50 md:dark:border-slate-500 md:dark:bg-slate-800">
      {roleOptions.map((role) => (
        <div
          key={role.value}
          className={`flex items-center space-x-1 rounded-md p-1 pr-8 lg:space-x-2 ${role.color} mx-4 scale-110`}
        >
          <Checkbox
            id={role.value}
            checked={selectedRoles.includes(role.value)}
            onCheckedChange={() => toggleRole(role.value)}
            className="border-sky-500 bg-sky-200 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500 dark:data-[state=checked]:bg-sky-500"
          />
          <div
            className={`${selectedRoles.includes(role.value) ? "opacity-100" : "opacity-50"} w-[90px] focus-visible:ring-sky-500 lg:pl-1`}
          >
            <span className="flex w-full items-center justify-between gap-1 px-1 text-sm leading-none font-medium">
              {role.label}
            </span>
          </div>
        </div>
      ))}
    </div>*/}
