"use client";

import { useState } from "react";
import { NoteTypeTitle } from "@/lib/globals";
import { DropletLesson, Highlight, HighlightColor, Note } from "@/types";
import { NotesFilter } from "./notes-filter";
import NotesSummary from "./notes-summary";

export function NotesContainer({
  dropletHighlights,
  dropletNotes,
  mappedLessons,
  allNotes,
}: {
  dropletHighlights: Highlight[];
  dropletNotes: Note[];
  mappedLessons: DropletLesson[];
  allNotes: {
    dropletId: number;
    notes: Note[];
    highlights: Highlight[];
  };
}) {
  const [selectedColors, setSelectedColors] = useState<NoteTypeTitle[]>(
    Object.values(NoteTypeTitle),
  );

  return (
    <div className="flex flex-row items-start">
      <div className="w-2/3 p-4 text-center text-xl font-bold">
        <NotesSummary
          selectedColors={selectedColors.map(
            (color) => color.toLowerCase() as HighlightColor,
          )}
          dropletHighlights={dropletHighlights}
          dropletNotes={dropletNotes}
          mappedLessons={mappedLessons}
          allNotes={allNotes}
        />
      </div>
      {(allNotes.highlights.length > 0 || allNotes.notes.length > 0) && <div className="flex w-1/3 flex-col items-center justify-center pt-2 text-center text-xl font-bold dark:text-slate-300">
        Filters
        <NotesFilter onFilterChange={setSelectedColors} />
      </div>}
    </div>
  );
}
