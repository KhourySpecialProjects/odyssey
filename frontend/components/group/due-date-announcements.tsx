"use client";

import { DueDate, Group } from "@/types";
import { getDropletById } from "@/lib/requests/droplet";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Droplet, ListVideo } from "lucide-react";
import { DateTime } from "luxon";

interface DueDateAnnouncementsProps {
  group: Group;
  dueDates: DueDate[];
}

export default function DueDateAnnouncements({
  group,
  dueDates,
}: DueDateAnnouncementsProps) {
  const [visibleDates, setVisibleDates] = useState<number | undefined>(5);

  const handleSeeMore = () => {
    if (visibleDates) {
      setVisibleDates(undefined);
    } else {
      setVisibleDates(5);
    }
  };

  const getDaysUntil = (dueDate: DueDate) => {
    let daysUntil = "0";
    if (dueDate && dueDate.dueDate !== "") {
      const dueDateObject = DateTime.fromISO(dueDate.dueDate);
      const today = DateTime.local().startOf("day"); // Set to start of day
      const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
      daysUntil = String(Math.ceil(diffDays));
    }
    return daysUntil;
  };

  return (
    <div className="space-y-3 w-2/3">
      <h2 className="text-2xl font-semibold">Upcoming Due Dates</h2>
      <div className="space-y-5">
        {dueDates.slice(0, visibleDates).map((dueDate, index) => (
          <Link
            key={index}
            href={`/${dueDate.droplet ? "d" : "p"}/${dueDate.droplet ? dueDate.droplet?.slug : dueDate.playlist?.slug}`}
          >
            <div
              className={` p-2 rounded-md flex flex-row mb-1 hover:scale-105 ${getDueDateBadgeColor(Number(getDaysUntil(dueDate)), false)}`}
            >
              {dueDate.droplet ? <Droplet /> : <ListVideo />}
              <p className="font-bold ml-1">
                {dueDate.droplet
                  ? dueDate.droplet.name
                  : dueDate.playlist?.name}
              </p>
              {Number(getDaysUntil(dueDate)) > 0 ? (
                <p>
                  &nbsp;is due in {getDaysUntil(dueDate)}{" "}
                  {Number(getDaysUntil(dueDate)) > 1 ? "days" : "day"}!
                </p>
              ) : (
                <p>&nbsp;is due today!</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {dueDates.length > 5 && (
        <Button
          variant="link"
          size="xs"
          className="text-blue-400"
          onClick={handleSeeMore}
        >
          {" "}
          {visibleDates ? `see more` : `see less`}...
        </Button>
      )}
    </div>
  );
}
