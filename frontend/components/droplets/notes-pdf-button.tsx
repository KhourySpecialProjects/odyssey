"use client";
import { FileTextIcon } from "lucide-react";


export function NotesPdfButton({pdfBytes  } : {pdfBytes: Uint8Array}) {
  

  return (
    <button
        onClick={() => {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        }}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700"
    >
        <FileTextIcon className="w-4 h-4" />
        View Notes as PDF
    </button>
  );
}
