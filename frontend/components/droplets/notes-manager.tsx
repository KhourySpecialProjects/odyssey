"use client";
import { useState, useEffect } from "react";
import { NotesSummaryClient } from "./notes-summary-client";
import { NotesPdfButton } from "./notes-pdf-button";
import { PDFDocument } from "pdf-lib";
import { NoteSummary } from "./lessons/note-taking/note-summary";
import { Enrollment, Highlight, Note } from "@/types";
import { Button } from "../ui/button";

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

  const handleSelectAll = () => {
    const newSelection = new Set(filteredEnrollments.map((e) => e.droplet.id));
    setSelectedDropletIds(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = new Set(selectedDropletIds);
    filteredEnrollments.map((e) => {
      newSelection.delete(e.droplet.id);
    });
    setSelectedDropletIds(newSelection);
  };

  const generatePDF = async (selectedIds: Set<number>) => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const enrollment of filteredEnrollments) {
        if (!selectedIds.has(enrollment.droplet.id)) continue;

        const dropletData = allNotes.find(
          (data) => data.dropletId === enrollment.droplet.id,
        );

        if (!dropletData) continue;

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

  const filteredEnrollments = enrollments.filter((e, index) => {
    const dropletData = allNotes[index];
    if (!e || !dropletData) return false;
    return (
      (dropletData.highlights && dropletData.highlights.length > 0) ||
      dropletData.notes.length > 0
    );
  });

  return (
    <>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-6xl font-black text-slate-900 dark:text-white">
          Saved Notes
        </h1>
        <p className="pb-2 dark:text-slate-300">
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
              noNotes={
                filteredEnrollments.filter((enrollment) =>
                  selectedDropletIds.has(enrollment.droplet.id),
                ).length === 0
              }
            />
          )}
        </section>
        <p className="pt-2 text-sm dark:text-slate-300">
          Use the check boxes to select which notes you would like included in
          the PDF
        </p>
      </div>
      <div className="flex flex-row gap-2">
        <Button onClick={handleSelectAll} className="w-24">
          Select All
        </Button>
        <Button onClick={handleDeselectAll} className="w-24">
          Deselect All
        </Button>
      </div>
      <div className="mx-auto w-full space-y-4">
        {filteredEnrollments.map((enrollment) => {
          const dropletData = allNotes.find(
            (data) => data.dropletId === enrollment.droplet.id,
          );

          if (!dropletData) return null;

          return (
            <NotesSummaryClient
              key={enrollment.id}
              // Remove index prop
              dropletHighlights={dropletData.highlights}
              dropletNotes={dropletData.notes}
              enrollment={enrollment}
              allNotes={allNotes} // Keep the full array
              onSelectionChange={handleSelectionChange}
              selectedDropletIds={selectedDropletIds}
            />
          );
        })}
      </div>
    </>
  );
}
