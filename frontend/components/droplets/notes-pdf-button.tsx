"use client";
import { FileTextIcon } from "lucide-react";

export function NotesPdfButton({
  pdfBytes,
  name,
  noNotes,
}: {
  pdfBytes: Uint8Array;
  name: string;
  noNotes?: boolean;
}) {
  const handleDownload = () => {
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white ${noNotes ? "light:text-black bg-slate-300 dark:text-black" : "bg-sky-600 hover:bg-sky-700"} rounded-md`}
      disabled={noNotes}
    >
      <FileTextIcon className="h-4 w-4" />
      Download Notes as PDF
    </button>
  );
}
