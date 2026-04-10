"use client";

import { useState, useEffect } from "react";
import { IconHighlight, IconX } from "@tabler/icons-react";

const STORAGE_KEY = "odyssey-highlight-hint-dismissed";

export function HighlightHintBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mt-6 mb-6 flex items-center gap-3 rounded-lg border border-[#2D7597]/20 bg-[#2D7597]/5 px-4 py-3 text-sm text-[#2D7597]">
      <IconHighlight className="h-4 w-4 shrink-0" />
      <span>Select any text to highlight it, take notes, or save quotes.</span>
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 opacity-60 hover:opacity-100"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
