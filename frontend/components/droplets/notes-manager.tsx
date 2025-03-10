"use client";
import { useState, useEffect } from "react";
import { NotesSummaryClient } from "./notes-summary-client";
import { NotesPdfButton } from "./notes-pdf-button";
import { PDFDocument } from "pdf-lib";
import { NoteSummary } from "./lessons/note-taking/note-summary";
import { Enrollment, Highlight, Note } from "@/types";

export function NotesManager({
  enrollments,
  allNotes,
  initialPdfBytes,
}: {
  enrollments: Enrollment[];
  allNotes: {
    dropletId: number;
    notes: Note[];
    highlights: Highlight[];
  }[];
  initialPdfBytes: Uint8Array;
}) {
  const [selectedDropletIds, setSelectedDropletIds] = useState<Set<number>>(
    new Set(),
  );
  const [pdfBytes, setPdfBytes] = useState<Uint8Array>(initialPdfBytes);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (selectedIds: Set<number>) => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < enrollments.length; i++) {
        const enrollment = enrollments[i];
        if (!selectedIds.has(enrollment.droplet.id)) continue;

        const dropletData = allNotes[i];
        const sectionPdfBytes = await NoteSummary({
          filteredHighlights: dropletData.highlights,
          notes: dropletData.notes,
          droplet: enrollment.droplet,
        });

        const sectionPdfDoc = await PDFDocument.load(sectionPdfBytes);
        const sectionPages = sectionPdfDoc.getPages();

        for (let j = 0; j < sectionPages.length; j++) {
          const [copiedPage] = await pdfDoc.copyPages(sectionPdfDoc, [j]);
          pdfDoc.addPage(copiedPage);
        }
      }

      const newPdfBytes = await pdfDoc.save();
      setPdfBytes(newPdfBytes);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectionChange = (dropletId: number, isSelected: boolean) => {
    const newSelection = new Set(selectedDropletIds);
    if (isSelected) {
      newSelection.add(dropletId);
    } else {
      newSelection.delete(dropletId);
    }
    setSelectedDropletIds(newSelection);
  };

  useEffect(() => {
    generatePDF(selectedDropletIds);
  }, [selectedDropletIds]);

  return (
    <>
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-6xl font-black text-slate-900 dark:text-white">
          Saved Notes
        </h1>
        <p className="dark:text-slate-300">
          A collection of notes and highlights that you have created
        </p>
        <hr></hr>
        <section className="pt-8">
          {isGenerating ? (
            <div className="text-sm text-slate-500">Generating PDF...</div>
          ) : (
            <NotesPdfButton
              pdfBytes={pdfBytes}
              name="notes-summary"
              enrollments={enrollments.filter((enrollment) =>
                selectedDropletIds.has(enrollment.droplet.id),
              )}
            />
          )}
        </section>
        <p className="dark:text-slate-300 text-sm pt-2">
          Use the check boxes to select which notes you would like included in
          the PDF
        </p>
      </div>
      <div className="w-full max-w-2xl mx-auto space-y-4">
        {enrollments.map((enrollment, index) => {
          const dropletData = allNotes[index];
          return (
            <NotesSummaryClient
              key={enrollment.id}
              index={index}
              dropletHighlights={dropletData.highlights}
              dropletNotes={dropletData.notes}
              enrollment={enrollment}
              allNotes={allNotes}
              enrollments={enrollments}
              onSelectionChange={handleSelectionChange}
            />
          );
        })}
      </div>
    </>
  );
}
