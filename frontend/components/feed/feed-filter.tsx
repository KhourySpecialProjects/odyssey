"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleAlert, Droplet, Handshake, ListVideo, PartyPopper, UsersRound } from "lucide-react";

interface FeedFilterProps {
  onFilterChange: (selectedRoles: AnnouncementTypeTitle[]) => void;
}

export function FeedFilter({ onFilterChange }: FeedFilterProps) {
  const roleOptions = [
    {
      value: AnnouncementTypeTitle.Droplet,
      label: (
        <div className="flex items-center justify-between w-full">
          <span>Droplet</span>
          <Droplet size={20} />
        </div>
      ),
      color: "bg-blue-100 dark:bg-blue-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Playlist,
      label: (
        <div className="flex items-center justify-between w-full">
          <span>Playlist</span>
          <ListVideo size={20} />
        </div>
      ),
      color: "bg-green-100 dark:bg-green-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Group,
      label: (
        <div className="flex items-center justify-between w-full">
          Group <UsersRound size={20} />
        </div>
      ),
      color: "bg-purple-100 dark:bg-purple-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.System,
      label: (
        <div className="flex items-center justify-between w-full">
          System <CircleAlert size={20} />
        </div>
      ),
      color: "bg-red-100 dark:bg-red-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Friend,
      label: (
        <div className="flex items-center justify-between w-full">
          Friend <Handshake size={20} />
        </div>
      ),
      color: "bg-yellow-100 dark:bg-yellow-800 dark:text-slate-300",
    },
    {
      value: AnnouncementTypeTitle.Kudos,
      label: (
        <div className="flex items-center justify-between w-full">
          Kudos <PartyPopper size={20} />
        </div>
      ),
      color: "bg-orange-100 dark:bg-orange-800 dark:text-slate-300",
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
    <div className="space-y-2 pt-4">
      {roleOptions.map((role) => (
        <div
          key={role.value}
          className={`flex items-center space-x-2 p-1 rounded-lg ${role.color}`}
        >
          <Checkbox
            id={role.value}
            checked={selectedRoles.includes(role.value)}
            onCheckedChange={() => toggleRole(role.value)}
            className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 focus-visible:ring-sky-500"
          />
          <label
            htmlFor={role.value}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
          >
            {role.label}
          </label>
        </div>
      ))}
    </div>
  );
}
