"use client";
import { stripHtmlTags } from "@/lib/utils";
import { Highlight, HighlightColor, Lesson, Note } from "@/types";
import { HighlighterIcon, NotebookPen } from "lucide-react";

export default function NotesSummary({
  dropletHighlights,
  dropletNotes,
  mappedLessons,
  selectedColors,
  allNotes,
}: {
  dropletHighlights: Highlight[];
  dropletNotes: Note[];
  mappedLessons: Lesson[];
  selectedColors: HighlightColor[];
  allNotes: {
    dropletId: number;
    notes: Note[];
    highlights: Highlight[];
  };
}) {
  const filteredNewHighlights = dropletHighlights.filter((highlight) =>
    selectedColors.includes(highlight.color),
  );
  const filteredNewNotes = dropletNotes.filter(
    (note) => !note.highlight || selectedColors.includes(note.highlight.color),
  );
  return (
    <>
      <div className=" ">
        {filteredNewHighlights.length > 0 || filteredNewNotes.length > 0 ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
            <ul className="flex flex-col">
              {mappedLessons.map((lesson) => {
                const lessonNotes = allNotes.notes.filter(
                  (note) => note.lesson?.id === lesson.id,
                );
                const lessonHighlights = dropletHighlights.filter(
                  (highlight) => highlight.lesson?.id === lesson.id,
                );
                const filteredHighlights = lessonHighlights.filter(
                  (highlight) => selectedColors.includes(highlight.color),
                );
                const filteredNotes = lessonNotes.filter(
                  (note) =>
                    !note.highlight ||
                    selectedColors.includes(note.highlight.color),
                );
                return (
                  <div key={`lesson-${lesson.id}`} className="flex flex-col">
                    {(filteredNotes.length > 0 ||
                      filteredHighlights.length > 0) && (
                      <p className="border pl-4 font-bold dark:border-slate-500">
                        {lesson.name}
                      </p>
                    )}
                    {filteredHighlights.map((highlight) => (
                      <li
                        key={highlight.id}
                        className="inline-flex items-center gap-2 border px-4 py-3 leading-snug dark:border-slate-500 dark:text-slate-300"
                      >
                        <HighlighterIcon className="mr-0.5 h-5 w-5 shrink-0" />
                        <span
                          className={`bg-[${highlight.color}] rounded px-1 dark:text-black`}
                        >
                          {highlight.text}
                        </span>
                      </li>
                    ))}
                    {filteredNotes.map((note) => (
                      <li
                        key={note.id}
                        className="inline-flex items-center gap-2 border px-4 py-3 leading-snug dark:border-slate-500 dark:text-slate-300"
                        data-testid={`note-${note.id}`}
                      >
                        <NotebookPen className="mr-0.5 h-5 w-5 shrink-0" />
                        <span>
                          {note.highlight ? (
                            <>
                              <div
                                className={`bg-[${note.highlight.color}] rounded px-1 text-left dark:text-black`}
                              >
                                {note.highlight.text}
                              </div>
                              <div>{stripHtmlTags(note.content)}</div>
                            </>
                          ) : (
                            stripHtmlTags(note.content)
                          )}
                        </span>
                      </li>
                    ))}
                  </div>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="pt-2">
            You have no saved notes or highlights for this droplet.
          </div>
        )}
      </div>
    </>
  );
}
