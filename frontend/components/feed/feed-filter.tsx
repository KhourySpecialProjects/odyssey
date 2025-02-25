"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";

interface FeedFilterProps {
  onFilterChange: (selectedRoles: AnnouncementTypeTitle[]) => void;
}

export function FeedFilter({ onFilterChange }: FeedFilterProps) {
  const roleOptions = [
    {
      value: AnnouncementTypeTitle.Droplet,
      label: "Droplet",
      color: "bg-blue-100",
    },
    {
      value: AnnouncementTypeTitle.Playlist,
      label: "Playlist",
      color: "bg-green-100",
    },
    {
      value: AnnouncementTypeTitle.Group,
      label: "Group",
      color: "bg-purple-100",
    },
    {
      value: AnnouncementTypeTitle.System,
      label: "System",
      color: "bg-red-100",
    },
    {
      value: AnnouncementTypeTitle.Friend,
      label: "Friend",
      color: "bg-yellow-100",
    },
    {
      value: AnnouncementTypeTitle.Kudos,
      label: "Kudos",
      color: "bg-orange-100",
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
          className={`flex items-center space-x-2 ${role.color}`}
        >
          <Checkbox
            id={role.value}
            checked={selectedRoles.includes(role.value)}
            onCheckedChange={() => toggleRole(role.value)}
            className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 focus-visible:ring-sky-500"
          />
          <label
            htmlFor={role.value}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {role.label}
          </label>
        </div>
      ))}
    </div>
  );
}
