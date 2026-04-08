"use client";
import { IconFileText } from "@tabler/icons-react";

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
      disabled={noNotes}
      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2D7597] bg-[#2D7597] px-4 text-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78] disabled:pointer-events-none disabled:opacity-50"
    >
      <IconFileText className="h-4 w-4" stroke={1.8} />
      Download Notes as PDF
    </button>
  );
}
