"use client";

import { useState } from "react";
import { NoteTypeTitle } from "@/lib/globals";
import { Highlight, HighlightColor, Lesson, Note } from "@/types";
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
  mappedLessons: Lesson[];
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
    <div className="flex flex-row items-start gap-4">
      <div className="flex-1 text-left">
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
      {(allNotes.highlights.length > 0 || allNotes.notes.length > 0) && (
        <div className="mt-4 w-36 shrink-0 overflow-hidden rounded-lg border border-[#eaecf0] dark:border-slate-700">
          <p className="border-b border-[#eaecf0] bg-[#fcfcfd] px-4 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Filters
          </p>
          <div className="bg-white px-4 py-3 dark:bg-slate-900">
            <NotesFilter onFilterChange={setSelectedColors} />
          </div>
        </div>
      )}
    </div>
  );
}
