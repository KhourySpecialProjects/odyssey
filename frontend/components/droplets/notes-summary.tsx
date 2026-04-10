"use client";
import { stripHtmlTags } from "@/lib/utils";
import { Highlight, HighlightColor, Lesson, Note } from "@/types";
import { IconHighlight, IconNotes } from "@tabler/icons-react";

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
      <div>
        {filteredNewHighlights.length > 0 || filteredNewNotes.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#eaecf0] dark:border-slate-700">
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
                      <p className="border-b border-[#eaecf0] bg-[#fcfcfd] py-2 pl-4 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {lesson.name}
                      </p>
                    )}
                    {filteredHighlights.map((highlight) => (
                      <li
                        key={highlight.id}
                        className="inline-flex items-center gap-2 border-b border-[#eaecf0] bg-white px-4 py-3 text-sm leading-snug last:border-b-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <IconHighlight
                          className="mr-0.5 h-5 w-5 shrink-0"
                          stroke={1.8}
                        />
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
                        className="inline-flex items-center gap-2 border-b border-[#eaecf0] bg-white px-4 py-3 text-sm leading-snug last:border-b-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        data-testid={`note-${note.id}`}
                      >
                        <IconNotes
                          className="mr-0.5 h-5 w-5 shrink-0"
                          stroke={1.8}
                        />
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
        ) : null}
      </div>
    </>
  );
}
