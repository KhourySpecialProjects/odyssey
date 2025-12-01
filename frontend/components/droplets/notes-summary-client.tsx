"use client";

import { useState, useEffect } from "react";
import { Enrollment, Highlight, Note } from "@/types";
import { Card } from "../ui/card";
import Link from "next/link";
import { NotesContainer } from "./notes-container";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

export function NotesSummaryClient({
  dropletHighlights,
  dropletNotes,
  enrollment,
  allNotes,
  onSelectionChange,
  selectedDropletIds,
}: {
  dropletHighlights: Highlight[];
  dropletNotes: Note[];
  enrollment: Enrollment;
  allNotes: {
    dropletId: number;
    notes: Note[];
    highlights: Highlight[];
  }[];
  onSelectionChange: (dropletId: number, isSelected: boolean) => void;
  selectedDropletIds: Set<number>;
}) {
  // Find the matching droplet data
  const currentDropletData = allNotes.find(
    (data) => data.dropletId === enrollment.droplet.id,
  );

  const [openDroplets, setOpenDroplets] = useState<{ [key: number]: boolean }>(
    {},
  );

  const [selectedDroplets, setSelectedDroplets] = useState<
    Record<number, boolean>
  >(Object.fromEntries(Array.from(selectedDropletIds).map((id) => [id, true])));

  useEffect(() => {
    setSelectedDroplets(
      Object.fromEntries(
        Array.from(selectedDropletIds).map((id) => [id, true]),
      ),
    );
  }, [selectedDropletIds]);

  const toggleDroplets = (dropletId: number) => {
    setOpenDroplets((prev) => ({
      ...prev,
      [dropletId]: !prev[dropletId],
    }));
  };

  const toggleSelectedDroplets = (dropletId: number) => {
    const newValue = !selectedDroplets[dropletId];
    setSelectedDroplets((prev) => ({
      ...prev,
      [dropletId]: newValue,
    }));
    onSelectionChange(dropletId, newValue);
  };

  // Safety check - if no data found, don't render
  if (!currentDropletData) return null;

  return (
    <Card key={`enrollment-${enrollment.id}`} className="p-2 dark:bg-slate-800">
      <div
        className={`flex text-center text-2xl ${openDroplets[enrollment.droplet.id] ? "border-b dark:border-slate-500" : ""} items-center p-2 font-bold`}
      >
        <Checkbox
          id={enrollment.droplet.name}
          checked={selectedDroplets[enrollment.droplet.id]}
          onCheckedChange={() => toggleSelectedDroplets(enrollment.droplet.id)}
          className="border-sky-500 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
        />
        <div className="flex-1 text-center">
          <Link href={`/d/${enrollment.droplet.slug}`}>
            {enrollment.droplet.name}
          </Link>
        </div>
        <div className="pr-2">
          (
          {currentDropletData.highlights.length +
            currentDropletData.notes.length}
          )
        </div>
        <button
          className="ml-auto flex justify-end border py-2 font-bold dark:border-slate-500"
          onClick={() => toggleDroplets(enrollment.droplet.id)}
        >
          {openDroplets[enrollment.droplet.id] ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {openDroplets[enrollment.droplet.id] && (
        <NotesContainer
          allNotes={currentDropletData}
          dropletHighlights={dropletHighlights}
          dropletNotes={dropletNotes}
          mappedLessons={enrollment.droplet.lessons || []}
        />
      )}
    </Card>
  );
}
