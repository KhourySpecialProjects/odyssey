"use client";
import { DropletLesson, Highlight, HighlightColor, Note } from "@/types";
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
  mappedLessons: DropletLesson[];
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
    (note) => note.highlight && selectedColors.includes(note.highlight.color),
  );
  return (
    <>
      <div className=" ">
        {filteredNewHighlights.length > 0 || filteredNewNotes.length > 0 ? (
          <div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
            <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
              {mappedLessons.map((lesson) => {
                const lessonNotes = allNotes.notes.filter(
                  (note) => note.lesson?.droplet_lessons[0].id === lesson.id,
                );
                const lessonHighlights = dropletHighlights.filter(
                  (highlight) =>
                    highlight.lesson?.droplet_lessons[0].id === lesson.id,
                );
                const newHighlights = lessonHighlights.filter(
                  (highlight) =>
                    !lessonNotes.some(
                      (lesson) => lesson.highlight?.id === highlight.id,
                    ),
                );
                const filteredHighlights = newHighlights.filter((highlight) =>
                  selectedColors.includes(highlight.color),
                );
                const filteredNotes = lessonNotes.filter(
                  (note) =>
                    note.highlight &&
                    selectedColors.includes(note.highlight.color),
                );
                return (
                  <div key={`lesson-${lesson.id}`} className="flex flex-col">
                    {(filteredNotes.length > 0 ||
                      filteredHighlights.length > 0) && (
                      <p className="pl-4 font-bold border dark:border-slate-500">
                        {lesson.lesson.name}
                      </p>
                    )}
                    {filteredHighlights.map((highlight) => (
                      <li
                        key={highlight.id}
                        className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300 border dark:border-slate-500"
                      >
                        <HighlighterIcon className="w-5 h-5 mr-0.5 shrink-0" />
                        <span
                          className={`bg-[${highlight.color}] px-1 rounded dark:text-black`}
                        >
                          {highlight.text}
                        </span>
                      </li>
                    ))}
                    {filteredNotes.map((note) => (
                      <li
                        key={note.id}
                        className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                      >
                        <NotebookPen className="w-5 h-5 mr-0.5 shrink-0" />
                        <span>
                          {note.highlight ? (
                            <>
                              <div
                                className={`bg-[${note.highlight.color}] px-1 rounded dark:text-black text-left`}
                              >
                                {note.highlight.text}
                              </div>
                              <div>{note.content}</div>
                            </>
                          ) : (
                            note.content
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
          <div className="border-t dark:border-slate-500 pt-2 mt-1">
            You have no saved notes or highlights for this droplet.
          </div>
        )}
      </div>
    </>
  );
}
