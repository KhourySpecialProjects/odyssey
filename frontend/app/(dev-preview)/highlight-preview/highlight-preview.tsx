"use client";

// TEMPORARY: local preview for ODY-785. Delete before committing.
// Renders the real GenericBlockRenderer (drawing, selection, toolbar) with
// in-memory saves that mirror LessonRenderer's handlers, so highlighting can
// be tried without Strapi.

import { useRef, useState } from "react";
import { toast } from "sonner";
import GenericBlockRenderer, {
  type HighlightDraft,
  type HighlightMerge,
} from "@/components/droplets/lessons/generic-block-renderer";
import { Highlight, HighlightColor } from "@/types";
import "katex/dist/katex.min.css";

const BLOCKS = [
  {
    id: 1,
    content:
      "<h2>Joining tables</h2><p>SQL is a language for asking questions of data. SQL has joins, which combine rows from two tables. Use <strong>inner</strong> joins when both sides must match, and <a href='#'>outer joins</a> when one side may be missing. The <code>ON</code> clause says which columns to compare.</p>",
  },
  {
    id: 2,
    content:
      "<p>Select a few words with the mouse, with Shift + arrow keys, or by long-press on a phone. Try a selection that overlaps an existing highlight, too.</p><ul><li>Pink, orange, yellow, green and blue are available.</li><li>Click a highlight to recolour it, remove it or add a note.</li></ul>",
  },
  {
    id: 3,
    content:
      '<p>Code is highlightable as well:</p><pre><code class="language-sql">SELECT name, title\nFROM students\nJOIN courses ON courses.id = students.course_id;</code></pre><p>And maths, like $a^2 + b^2 = c^2$, renders with KaTeX.</p>',
  },
];

// Block 1's text: "Joining tablesSQL is a language ... SQL has joins ..."
const INITIAL: Highlight[] = [
  {
    id: 1,
    text: "SQL",
    color: "#fff300",
    position: { start: 14, end: 17 },
    blockId: 1,
  },
  {
    id: 2,
    text: "SQL",
    color: "#86efac",
    position: { start: 62, end: 65 },
    blockId: 1,
    note: { id: 1 },
  },
  {
    id: 3,
    text: "Use inner joins",
    color: "#93c5fd",
    position: { start: 113, end: 128 },
    blockId: 1,
  },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function HighlightPreview() {
  const [highlights, setHighlights] = useState<Highlight[]>(INITIAL);
  const [failSaves, setFailSaves] = useState(false);
  const [delay, setDelay] = useState(800);
  const nextTempId = useRef(-1);
  const nextId = useRef(100);

  // A stand-in for a server action: waits, then succeeds unless told to fail
  const fakeSave = async () => {
    await wait(delay);
    return !failSaves;
  };

  const handleHighlight = async (
    draft: HighlightDraft,
    {
      merge,
      withNote = false,
    }: { merge?: HighlightMerge; withNote?: boolean } = {},
  ): Promise<Highlight | null> => {
    if (merge) {
      const base = highlights.find((h) => h.id === merge.baseId);
      const removed = highlights.filter((h) =>
        merge.removeIds.includes(h.id ?? 0),
      );
      if (!base) return null;
      if ([base, ...removed].filter((h) => h.note).length > 1) {
        toast.error(
          "These highlights both have notes, so they can't be merged",
        );
        return null;
      }
      const merged: Highlight = { ...base, ...draft };
      setHighlights((prev) =>
        prev
          .filter((h) => !merge.removeIds.includes(h.id ?? 0))
          .map((h) => (h.id === merge.baseId ? merged : h)),
      );
      if (!(await fakeSave())) {
        setHighlights((prev) => [
          ...prev.map((h) => (h.id === merge.baseId ? base : h)),
          ...removed,
        ]);
        toast.error("Failed to save highlight");
        return null;
      }
      if (!withNote) toast.success(`Highlight saved (merged into #${base.id})`);
      return merged;
    }

    const tempId = nextTempId.current--;
    setHighlights((prev) => [...prev, { ...draft, id: tempId }]);
    if (!(await fakeSave())) {
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
      toast.error("Failed to save highlight");
      return null;
    }
    const saved: Highlight = { ...draft, id: nextId.current++ };
    setHighlights((prev) => prev.map((h) => (h.id === tempId ? saved : h)));
    if (!withNote) toast.success("Highlight saved");
    return saved;
  };

  const handleRecolor = async (id: number, color: HighlightColor) => {
    const before = highlights.find((h) => h.id === id);
    if (!before || before.color === color) return;
    const setColor = (next: HighlightColor) =>
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, color: next } : h)),
      );
    setColor(color);
    if (await fakeSave()) {
      toast.success(`Highlight #${id} saved`);
    } else {
      setColor(before.color);
      toast.error("Failed to save highlight");
    }
  };

  const handleDelete = async (id: number) => {
    const removed = highlights.find((h) => h.id === id);
    if (!removed) return;
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    if (await fakeSave()) {
      toast.success(`Highlight #${id} removed`);
    } else {
      setHighlights((prev) => [...prev, removed]);
      toast.error("Failed to remove highlight");
    }
  };

  const handleNote = (notePos: number, highlight: Highlight) => {
    setHighlights((prev) =>
      prev.map((h) => (h.id === highlight.id ? { ...h, note: {} } : h)),
    );
    toast.success(
      `Note linked to highlight #${highlight.id} ("${highlight.text}"), ${Math.round(notePos)}px down its block`,
    );
  };

  return (
    <div className="flex w-full gap-10 px-40 pt-6 pb-16">
      <div className="min-w-0 flex-1">
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ODY-785 preview: the real lesson block and toolbar, saving to memory
          instead of Strapi. Reload to reset.
        </p>
        <h1 className="text-[2.5rem] font-bold text-slate-900 dark:text-white">
          Highlighting preview
        </h1>
        <div className="mt-8 space-y-2">
          {BLOCKS.map((block) => (
            <GenericBlockRenderer
              key={block.id}
              block={block}
              highlights={highlights}
              onHighlight={handleHighlight}
              onRecolorHighlight={handleRecolor}
              onDeleteHighlight={handleDelete}
              onNote={handleNote}
              enrollmentId="preview"
            />
          ))}
        </div>
      </div>

      <aside className="sticky top-32 h-fit w-80 shrink-0 space-y-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-600">
        <h2 className="font-bold">Saved highlights</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={failSaves}
            onChange={(e) => setFailSaves(e.target.checked)}
          />
          Make saves fail
        </label>
        <label className="flex items-center gap-2">
          Save delay
          <input
            type="number"
            step={100}
            min={0}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 px-1"
          />
          ms
        </label>
        <ul className="space-y-2">
          {[...highlights]
            .sort(
              (a, b) =>
                a.blockId - b.blockId || a.position.start - b.position.start,
            )
            .map((h) => (
              <li key={h.id} className="flex items-start gap-2">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: h.color }}
                />
                <span>
                  <span className="font-mono">
                    #{h.id}
                    {(h.id ?? 0) < 0 && " (saving)"}
                  </span>{" "}
                  block {h.blockId}, {h.position.start}–{h.position.end}
                  {h.note && ", has note"}
                  <br />
                  <span className="text-slate-500">“{h.text}”</span>
                </span>
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}
