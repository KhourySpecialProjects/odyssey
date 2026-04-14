"use client";
import { useState, useEffect } from "react";
import { NotesSummaryClient } from "./notes-summary-client";
import { NotesPdfButton } from "./notes-pdf-button";
import { PDFDocument } from "pdf-lib";
import { NoteSummary } from "./lessons/note-taking/note-summary";
import { Enrollment, Highlight, Note } from "@/types";
import { Button } from "../ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconNotes } from "@tabler/icons-react";

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

  if (filteredEnrollments.length === 0) {
    return (
      <EmptyState
        icon={
          <IconNotes
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No notes yet"
        message="Notes and highlights you create while learning will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={handleSelectAll}
            size="sm"
            variant="outline"
            className="border-[#D0D5DD] text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
          >
            Select All
          </Button>
          <Button
            onClick={handleDeselectAll}
            size="sm"
            variant="outline"
            className="border-[#D0D5DD] text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
          >
            Deselect All
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {isGenerating ? (
            <span className="text-sm text-[#667085]">Generating PDF...</span>
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
        </div>
      </div>

      <p className="text-sm text-[#667085] dark:text-slate-400">
        Use the checkboxes to select which notes to include in the PDF export.
      </p>

      {/* Notes list */}
      <div className="space-y-4">
        {filteredEnrollments.map((enrollment) => {
          const dropletData = allNotes.find(
            (data) => data.dropletId === enrollment.droplet.id,
          );

          if (!dropletData) return null;

          return (
            <NotesSummaryClient
              key={enrollment.id}
              dropletHighlights={dropletData.highlights}
              dropletNotes={dropletData.notes}
              enrollment={enrollment}
              allNotes={allNotes}
              onSelectionChange={handleSelectionChange}
              selectedDropletIds={selectedDropletIds}
            />
          );
        })}
      </div>
    </div>
  );
}
