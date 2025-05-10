"use client";

import { DueDate } from "@/types";
import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Droplet, ListVideo } from "lucide-react";
import { DateTime } from "luxon";

interface DueDateAnnouncementsProps {
  dueDates: DueDate[];
}

export default function DueDateAnnouncements({
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
      const today = DateTime.local().startOf("day");
      const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
      daysUntil = String(Math.ceil(diffDays));
    }
    return daysUntil;
  };

  const processedDueDates = dueDates.filter((dueDate) => {
    return Number(getDaysUntil(dueDate)) >= 0;
  });

  return (
    <div className="w-2/3 space-y-3">
      <h2 className="text-2xl font-semibold">Upcoming Due Dates</h2>
      <div className="space-y-5">
        {processedDueDates.slice(0, visibleDates).map((dueDate, index) => (
          <Link
            key={index}
            href={`/${dueDate.droplet ? "d" : "p"}/${dueDate.droplet ? dueDate.droplet?.slug : dueDate.playlist?.slug}`}
          >
            <div
              className={`mb-1 flex flex-row rounded-md p-2 hover:scale-105 ${getDueDateBadgeColor(Number(getDaysUntil(dueDate)), false)}`}
            >
              {dueDate.droplet ? <Droplet /> : <ListVideo />}
              <p className="ml-1 font-bold">
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
