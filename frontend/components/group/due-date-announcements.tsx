"use client";

import { Group } from "@/types";
import { getDropletById } from "@/lib/requests/droplet";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Droplet, ListVideo } from "lucide-react";
import { DateTime } from "luxon";

interface ProcessedDropletDueDate {
  dropletName: string;
  daysUntil: string;
  dropletSlug: string;
}

interface ProcessedPlaylistDueDate {
  playlistName: string;
  daysUntil: string;
  playlistSlug: string;
}

interface ProcessedDueDate {
  name: string;
  daysUntil: string;
  slug: string;
  type: 'droplet' | 'playlist';
}

interface DueDateAnnouncementsProps {
  group: Group;
}

export default function DueDateAnnouncements({
  group,
}: DueDateAnnouncementsProps) {
  const [processedDropletDueDates, setProcessedDropletDueDates] = useState<
    ProcessedDropletDueDate[]
  >([]);
  const [processedPlaylistDueDates, setProcessedPlaylistDueDates] = useState<
    ProcessedPlaylistDueDate[]
  >([]);

  const [visibleDates, setVisibleDates] = useState<number | undefined>(5);
  const [combinedDueDates, setCombinedDueDates] = useState<ProcessedDueDate[]>([]);

  useEffect(() => {
    const dropletDates = processedDropletDueDates.map(d => ({
      name: d.dropletName,
      daysUntil: d.daysUntil,
      slug: d.dropletSlug,
      type: 'droplet' as const
    }));

    const playlistDates = processedPlaylistDueDates.map(p => ({
      name: p.playlistName,
      daysUntil: p.daysUntil,
      slug: p.playlistSlug,
      type: 'playlist' as const
    }));

    setCombinedDueDates([...dropletDates, ...playlistDates]
      .sort((a, b) => Number(a.daysUntil) - Number(b.daysUntil))
      .filter(date => Number(date.daysUntil) > 0)
    );
  }, [processedDropletDueDates, processedPlaylistDueDates]);


  useEffect(() => {
    const processDropletDueDates = async () => {
      const processed = (group.dropletDueDates || [])
        .map((dueDate) => {
          const droplet = group.droplets?.find(
            (d) => d.id === dueDate.dropletId,
          );
          if (!droplet) return null;

          /*let daysUntil = "0";
          if (dueDate.baseDueDate && dueDate.baseDueDate !== "") {
            const dueDateObject = new Date(dueDate.baseDueDate);
            const today = new Date();
            const diffTime = dueDateObject.getTime() - today.getTime();
            daysUntil = String(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }*/

          let daysUntil = "0";
          if (dueDate.baseDueDate && dueDate.baseDueDate !== "") {
              const dueDateObject = DateTime.fromISO(dueDate.baseDueDate);
              const today = DateTime.local().startOf('day');  // Set to start of day
              const diffDays = dueDateObject.startOf('day').diff(today, 'days').days;
              daysUntil = String(Math.ceil(diffDays));
              console.log("daysUntil", daysUntil);
          }

          return {
            dropletName: droplet.name,
            daysUntil,
            dropletSlug: droplet.slug,
          };
        })
        .filter(Boolean) as ProcessedDropletDueDate[];

      setProcessedDropletDueDates(
        processed
          .sort((n1, n2) => Number(n1.daysUntil) - Number(n2.daysUntil))
          .filter((dueDate) => Number(dueDate.daysUntil) > 0),
      );
    };

    const processPlaylistDueDates = async () => {
      const processed = (group.playlistDueDates || [])
        .map((dueDate) => {
          const playlist = group.playlists?.find(
            (d) => d.id === dueDate.playlistId,
          );
          if (!playlist) return null;

          /*let daysUntil = "0";
          if (dueDate.baseDueDate && dueDate.baseDueDate !== "") {
            const dueDateObject = new Date(dueDate.baseDueDate);
            const today = new Date();
            const diffTime = dueDateObject.getTime() - today.getTime();
            daysUntil = String(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }*/

          let daysUntil = "0";
          if (dueDate.baseDueDate && dueDate.baseDueDate !== "") {
              const dueDateObject = DateTime.fromISO(dueDate.baseDueDate);
              const today = DateTime.local().startOf('day');  // Set to start of day
              const diffDays = dueDateObject.startOf('day').diff(today, 'days').days;
              daysUntil = String(Math.ceil(diffDays));
              console.log("daysUntil", daysUntil);
          }

          return {
            playlistName: playlist.name,
            daysUntil,
            playlistSlug: playlist.slug,
          };
        })
        .filter(Boolean) as ProcessedPlaylistDueDate[];

      setProcessedPlaylistDueDates(
        processed
          .sort((n1, n2) => Number(n1.daysUntil) - Number(n2.daysUntil))
          .filter((dueDate) => Number(dueDate.daysUntil) > 0),
      );
    };

    processDropletDueDates();
    processPlaylistDueDates();

  }, [group.dropletDueDates, group.playlistDueDates]);

  const handleSeeMore = () => {
    if (visibleDates) {
      setVisibleDates(undefined);
    } else {
      setVisibleDates(5);
    }
  };


  return (
    <div className="space-y-3 w-2/3">
      <h2 className="text-2xl font-semibold">Upcoming Due Dates</h2>
      <div className="space-y-5">
        {combinedDueDates.slice(0, visibleDates).map((dueDate, index) => (
          <Link key={index} href={`/${dueDate.type === 'droplet' ? 'd' : 'p'}/${dueDate.slug}`}>
            <div
              className={` p-2 rounded-md flex flex-row mb-1 hover:scale-105 ${getDueDateBadgeColor(Number(dueDate.daysUntil), false)}`}
            >
              {dueDate.type === 'droplet' ? <Droplet /> : <ListVideo />}
              <p className="font-bold ml-1">{dueDate.name}</p>
              <p>
                &nbsp;is due in {dueDate.daysUntil}{" "}
                {Number(dueDate.daysUntil) > 1 ? "days" : "day"}!
              </p>
            </div>
          </Link>
        ))}
      </div>

      {combinedDueDates.length > 5 &&
        <Button
          variant="link"
          size="xs"
          className="text-blue-400"
          onClick={handleSeeMore}
        >
          {" "}
          {visibleDates ? `see more` : `see less`}...
        </Button>
      }
    </div>
  );
}
