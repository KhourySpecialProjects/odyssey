"use client";

import { useState } from "react";
import { AnnouncementType } from "@/types";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";

export function FeedFilter() {
  const roleOptions = [
    { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
    { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
    { value: AnnouncementTypeTitle.Group, label: "Group" },
    { value: AnnouncementTypeTitle.System, label: "System" },
    { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  ] as const;
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    roleOptions.map((role) => role.value),
 );

  const toggleRole = (role: AnnouncementTypeTitle) => {
    setSelectedRoles((current) =>
      current?.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );
  };

  

  return ( 
    <div className="space-y-2 pt-4">
        {roleOptions.map((role) => (
            <div
                key={role.value}
                className="flex items-center space-x-2"
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
  )}
