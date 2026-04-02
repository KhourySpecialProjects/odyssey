"use client";

import {
  IconHelpCircle,
  IconHighlight,
  IconNotebook,
  IconNotes,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface HighlightDropdownProps {
  setExpanded: (expanded: boolean) => void;
  expanded: boolean;
  isActive: boolean;
}

const btnClass =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-[#2D7597] bg-[#2D7597] text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78] cursor-pointer";

export function HighlightDropdown({
  setExpanded,
  expanded,
  isActive,
}: HighlightDropdownProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isActive) return null;
  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed flex ${expanded ? "xs:top-44 top-36 right-[355px] flex-col md:top-36" : "top-36 right-5 flex-col"} z-50 gap-2`}
    >
      {/* Help */}
      <div className={`${btnClass} z-50`}>
        <div className="group relative">
          <IconHelpCircle className="h-5 w-5 cursor-pointer" />
          <div className="pointer-events-none absolute top-full left-0 mt-2 flex w-max -translate-x-[100%] transform flex-col items-center gap-2 rounded bg-white p-4 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <p>Highlighting Instructions:</p>
            <ul className="list-disc pl-4">
              <li>Select any text to see highlight options.</li>
              <li>Pick a color to highlight the selected text.</li>
              <li>
                Press the <IconNotebook className="inline-block h-4 w-4" /> icon
                to add a note to selected text.
              </li>
              <li>
                Press the <IconTrash className="inline-block h-4 w-4" /> icon to
                delete an existing highlight.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Notes bar toggle */}
      <div
        title={expanded ? "Hide Notes Bar" : "View Notes Bar"}
        className={`${btnClass} z-50`}
        onClick={() => setExpanded(!expanded)}
      >
        <IconNotes className="h-5 w-5" />
      </div>
    </div>,
    document.body,
  );
}
