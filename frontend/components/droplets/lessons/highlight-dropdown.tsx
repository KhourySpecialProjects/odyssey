"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CircleHelp,
  Highlighter,
  NotebookPen,
  NotepadText,
  Pen,
  X,
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
}: HighlightDropdownProps) {

  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`fixed flex ${expanded ? "right-[19%] z-40 top-28 md:top-28 xs:top-44 flex-row" : "right-0 top-36 flex-col"} gap-2`}
    >
      <div
        className={`dark:bg-blue-100 dark:text-black border border-black z-30 transform -translate-x-1/2 bg-blue-100 p-2 rounded shadow-lg`}
      >
        <div className="relative group">
          <CircleHelp className="cursor-pointer " />
          <div className="absolute left-0 transform -translate-x-[100%] top-full mt-2 w-max gap-2 bg-white p-4 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center pointer-events-none">
            <p>Highlighting Instructions:</p>
            <ul className="list-disc pl-4">
              <li>
                Hover over the <Pen className="inline-block w-4 h-4" /> icon to
                see actions.
              </li>
              <li>Use the toggle to switch highlighting mode.</li>
              <li>In highlighting mode, selected text is highlighted.</li>
              <li>
                Press the <Highlighter className="inline-block w-4 h-4" /> icon
                to highlight text.
              </li>
              <li>
                Press the <X className="inline-block w-4 h-4" /> icon to delete
                a highlight.
              </li>
              <li>
                Press the <NotebookPen className="inline-block w-4 h-4" /> icon
                to add a note to text.
              </li>
              <li>Click a colored circle to change highlight color.</li>
            </ul>
          </div>
        </div>
      </div>
      <div
        title={expanded ? "Hide Notes Bar" : "View Notes Bar"}
        className="z-20 dark:text-black p-2 transform -translate-x-1/2 bg-blue-100 border border-black rounded shadow-lg"
      >
        <NotepadText
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer "
        />
      </div>
      <div className="dark:text-black z-20 transform -translate-x-1/2 border border-black bg-blue-100 p-2 rounded shadow-lg group"
      onMouseLeave={() => setVisible(false)}>
        <div className="relative">
          <Pen
            onMouseEnter={() => setVisible(true)}
            className="cursor-pointer" />

          <div className={`absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-max gap-2 bg-white p-4 rounded shadow-lg ${visible ? 'visible' : 'hidden'} transition-opacity flex flex-col items-center`}>
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
              title="Add Highlight"
              onClick={handlePopupHighlight}
              className="relative group"
            >
              <Highlighter size={30} />
            </button>

            <button
              title="Delete Highlight"
              onClick={handlePopupDelete}
              className="relative group"
            >
              <X size={30} />
            </button>

            <button
              title="Take Note"
              onClick={handleCreateNote}
              className="relative group note-button"
            >
              <NotebookPen size={30} />
            </button>

            <button
              title="Highlight Pink"
              onClick={() => handleApplyColor("#f9a8d4")}
              className={`w-6 h-6 rounded-full ${selectedColor === "#f9a8d4" ? "border-2 border-black" : "border border-gray-300"} bg-[#f9a8d4]`}
            />
            <button
              title="Highlight Orange"
              onClick={() => handleApplyColor("#fbd38d")}
              className={`w-6 h-6 rounded-full ${selectedColor === "#fbd38d" ? "border-2 border-black" : "border border-gray-300"} bg-[#fbd38d]`}
            />
            <button
              title="Highlight Yellow"
              onClick={() => handleApplyColor("#fff300")}
              className={`w-6 h-6 rounded-full ${selectedColor === "#fff300" ? "border-2 border-black" : "border border-gray-300"} bg-[#fff300]`}
            />
            <button
              title="Highlight Green"
              onClick={() => handleApplyColor("#86efac")}
              className={`w-6 h-6 rounded-full ${selectedColor === "#86efac" ? "border-2 border-black" : "border border-gray-300"} bg-[#86efac]`}
            />
            <button
              title="Highlight Blue"
              onClick={() => handleApplyColor("#93c5fd")}
              className={`w-6 h-6 rounded-full ${selectedColor === "#93c5fd" ? "border-2 border-black" : "border border-gray-300"} bg-[#93c5fd]`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
