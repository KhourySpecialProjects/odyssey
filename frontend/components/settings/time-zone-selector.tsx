"use client";

import { setTimeZone } from "@/lib/actions";
import { TimeZone } from "@/types";
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
    <div className="w-1/2 px-6 py-4 flex flex-row gap-4 items-center">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Time Zone
      </label>
      <select
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
