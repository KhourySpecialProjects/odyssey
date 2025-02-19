"use client"

import { Group } from "@/types";
import { getDropletById } from "@/lib/requests/droplet";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { getDueDateBadgeColor } from "@/lib/utils";

interface ProcessedDueDate {
    dropletName: string;
    daysUntil: string;
    dropletSlug: string;
}

interface DueDateAnnouncementsProps {
    group: Group;
}

export default function DueDateAnnouncements({ group }: DueDateAnnouncementsProps) {
    const [processedDueDates, setProcessedDueDates] = useState<ProcessedDueDate[]>([]);
    const [visibleDates, setVisibleDates] = useState<number | undefined>(5);

    useEffect(() => {
        const processDueDates = async () => {
            const processed = (group.dropletDueDates || []).map((dueDate) => {
                const droplet = group.droplets?.find(d => d.id === dueDate.dropletId);
                if (!droplet) return null;
        
                let daysUntil = "0";
                if (dueDate.baseDueDate && dueDate.baseDueDate !== "") {
                    const dueDateObject = new Date(dueDate.baseDueDate);
                    const today = new Date();
                    const diffTime = dueDateObject.getTime() - today.getTime();
                    daysUntil = String(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }
        
                return {
                    dropletName: droplet.name,
                    daysUntil,
                    dropletSlug: droplet.slug
                };
            }).filter(Boolean) as ProcessedDueDate[];
        
            setProcessedDueDates(processed
                .sort((n1, n2) => Number(n1.daysUntil) - Number(n2.daysUntil))
                .filter((dueDate) => Number(dueDate.daysUntil) > 0)
            );
        };

        processDueDates();
    }, [group.dropletDueDates]);

    const handleSeeMore = () => {
        if (visibleDates) {
            setVisibleDates(undefined)
        } else {
            setVisibleDates(5);
        }
    }




    return (
        <div className="space-y-3 w-2/3">
            <h2 className="text-2xl font-semibold">Upcoming Due Dates</h2>
                <div className="space-y-5">
                    {processedDueDates.slice(0, visibleDates).map((dueDate, index) => (
                        <Link key={index} href={`/d/${dueDate.dropletSlug}`}>
                            
                            <div className={` p-2 rounded-md flex flex-row mb-1 hover:scale-105 ${getDueDateBadgeColor(Number(dueDate.daysUntil), false)}`}>
                                <p className="font-bold">{dueDate.dropletName}</p>
                                <p>&nbsp;is due in {dueDate.daysUntil} {Number(dueDate.daysUntil) > 1 ? "days" : "day"}!</p>
                            </div>
                        </Link>
                    ))}
                </div>
            

            <Button variant="link"
                size="xs"
                className="text-blue-400"
                onClick={handleSeeMore}> {visibleDates ? `see more` : `see less`}...</Button>
        </div>
    );
}