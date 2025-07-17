"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CircleHelp,
  Highlighter,
  NotebookPen,
  NotepadText,
  Trash2Icon,
} from "lucide-react";
import { HighlightColor } from "@/types";
import { useState } from "react";

interface HighlightDropdownProps {
  selectedColor: HighlightColor;
  handleApplyColor: (color: HighlightColor) => void;
  isHighlighting: boolean;
  setIsHighlighting: () => void;
  handlePopupHighlight: () => void;
  handlePopupDelete: () => void;
  handleCreateNote: () => void;
  setExpanded: (expanded: boolean) => void;
  expanded: boolean;
  isActive: boolean;
  blockID: number;
}

export function HighlightDropdown({
  selectedColor,
  handleApplyColor,
  isHighlighting,
  setIsHighlighting,
  handlePopupHighlight,
  handlePopupDelete,
  handleCreateNote,
  setExpanded,
  expanded,
  isActive,
  blockID
}: HighlightDropdownProps) {
  const [visible, setVisible] = useState(false);
  if (!isActive) return null;

  return (
    <div
      className={`fixed flex ${expanded ? "xs:top-44 top-36 right-[355px] flex-col md:top-36" : "top-36 right-5 flex-col"} z-20 gap-2`}
    >
      <div
        className={`z-30 rounded border border-black bg-blue-100 p-2 shadow-lg dark:border-white dark:bg-slate-700 dark:text-white`}
      >
        {blockID}
        <div className="group relative">
          <CircleHelp className="cursor-pointer" />
          
          <div className="pointer-events-none absolute top-full left-0 mt-2 flex w-max -translate-x-[100%] transform flex-col items-center gap-2 rounded bg-white p-4 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <p>Highlighting Instructions:</p>
            <ul className="list-disc pl-4">
              <li>
                Hover over the <Highlighter className="inline-block h-4 w-4" />{" "}
                icon to see actions.
              </li>
              <li>
                Press the <Highlighter className="inline-block h-4 w-4" /> icon
                to highlight selected text.
              </li>
              <li>Use the toggle to switch highlighting mode.</li>
              <li>In highlighting mode, selected text is highlighted.</li>
              <li>
                Press the <Trash2Icon className="inline-block h-4 w-4" /> icon
                to delete a highlight.
              </li>
              <li>
                Press the <NotebookPen className="inline-block h-4 w-4" /> icon
                to add a note to text.
              </li>
              <li>Click a colored circle to change highlight color.</li>
            </ul>
          </div>
        </div>
      </div>
      <div
        title={expanded ? "Hide Notes Bar" : "View Notes Bar"}
        className="z-20 rounded border border-black bg-blue-100 p-2 shadow-lg dark:border-white dark:bg-slate-700 dark:text-white"
      >
        <NotepadText
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer"
        />
      </div>
      <div
        className="group z-20 rounded border border-black bg-blue-100 p-2 shadow-lg dark:border-white dark:bg-slate-700 dark:text-black"
        onMouseLeave={() => setVisible(false)}
      >
        <div className="relative">
          <Highlighter
            onMouseEnter={() => setVisible(true)}
            onClick={handlePopupHighlight}
            className="cursor-pointer dark:text-white"
            data-testid="pen"
          />

          <div
            className={`absolute top-full left-1/2 mt-2 w-max -translate-x-1/2 transform gap-2 rounded bg-white p-4 shadow-lg ${visible ? "visible" : "hidden"} flex flex-col items-center transition-opacity`}
          >
            <div title="Highlighting Mode">
              <Switch
                id="public"
                checked={isHighlighting}
                onCheckedChange={setIsHighlighting}
                className={`bg-black`}
              />
              <Label htmlFor="public" />
            </div>

            <button
              title="Delete Highlight"
              onClick={handlePopupDelete}
              className="group relative"
            >
              <Trash2Icon size={30} />
            </button>

            <button
              title="Take Note"
              onClick={handleCreateNote}
              className="group note-button relative"
            >
              <NotebookPen size={30} />
            </button>

            <button
              title="Highlight Pink"
              onClick={() => handleApplyColor("#f9a8d4")}
              className={`h-6 w-6 rounded-full ${selectedColor === "#f9a8d4" ? "border-2 border-black" : "border border-gray-300"} bg-[#f9a8d4]`}
            />
            <button
              title="Highlight Orange"
              onClick={() => handleApplyColor("#fbd38d")}
              className={`h-6 w-6 rounded-full ${selectedColor === "#fbd38d" ? "border-2 border-black" : "border border-gray-300"} bg-[#fbd38d]`}
            />
            <button
              title="Highlight Yellow"
              onClick={() => handleApplyColor("#fff300")}
              className={`h-6 w-6 rounded-full ${selectedColor === "#fff300" ? "border-2 border-black" : "border border-gray-300"} bg-[#fff300]`}
            />
            <button
              title="Highlight Green"
              onClick={() => handleApplyColor("#86efac")}
              className={`h-6 w-6 rounded-full ${selectedColor === "#86efac" ? "border-2 border-black" : "border border-gray-300"} bg-[#86efac]`}
            />
            <button
              title="Highlight Blue"
              onClick={() => handleApplyColor("#93c5fd")}
              className={`h-6 w-6 rounded-full ${selectedColor === "#93c5fd" ? "border-2 border-black" : "border border-gray-300"} bg-[#93c5fd]`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
