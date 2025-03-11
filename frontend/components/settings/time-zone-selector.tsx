"use client";

import { setTimeZone } from "@/lib/actions";
import { useState } from "react";

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
  userId,
}: TimeZoneSelectorProps) {
  const [selectedTimeZone, setSelectedTimeZone] = useState(
    currentZone || "America/New_York",
  );

  const handleChange = async (zone: string) => {
    console.log("zone ", zone);

    await setTimeZone(zone, userId);
    setSelectedTimeZone(zone);
  };

  return (
    <div className="px-6 py-4 flex flex-row gap-4 items-center">
      <div className="w-[12%]">
        <label className="block mb-1 ">Time Zone:</label>
      </div>
      <select
        className="w-[50%] px-3 py-2 border text-sm border-gray-300 dark:text-white dark:border-slate-800 rounded-md dark:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={selectedTimeZone}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="" disabled>
          Choose a time zone...
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
