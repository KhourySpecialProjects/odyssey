"use client";

import { setTimeZone } from "@/lib/actions";
import { useState } from "react";
import { toast } from "sonner";

const timeZones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
];

interface TimeZoneSelectorProps {
  currentZone: string;
  userId: number;
}

export default function TimeZoneSelector({
  currentZone,
}: TimeZoneSelectorProps) {
  const [selectedTimeZone, setSelectedTimeZone] = useState(currentZone);
  const handleChange = async (zone: string) => {
    await setTimeZone(zone);
    setSelectedTimeZone(zone);
    toast.success("Time zone updated successfully!");
  };

  return (
    <div>
      <label className="mb-2 block text-xl font-bold text-slate-900 dark:text-white">
        Time Zone
      </label>
      <select
        className="w-full rounded-md border border-[#D0D5DD] px-3 py-2 text-sm focus:ring-2 focus:ring-[#287697] focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white"
        value={selectedTimeZone}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="" disabled>
          Choose a time zone
        </option>
        {timeZones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
    </div>
  );
}
