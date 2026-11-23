"use client";

import { setTimeZone } from "@/lib/actions";
import { TIME_ZONES } from "@/lib/time-zones";
import { useState } from "react";
import { toast } from "sonner";

interface TimeZoneSelectorProps {
  currentZone: string;
  userId: number;
}

export default function TimeZoneSelector({
  currentZone,
}: TimeZoneSelectorProps) {
  const [selectedTimeZone, setSelectedTimeZone] = useState(currentZone);
  const handleChange = async (zone: string) => {
    const result = await setTimeZone(zone).catch(() => null);
    if (!result || !("success" in result) || !result.success) {
      toast.error("Could not update your time zone. Please try again.");
      return;
    }
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
        {TIME_ZONES.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
    </div>
  );
}
