import { Droplet, Highlight, Note } from "@/types";
import { PDFDocument, rgb } from "pdf-lib";

export async function NoteSummary({
  filteredHighlights,
  notes,
  droplet,
}: {
  filteredHighlights: Highlight[];
  notes: Note[];
  droplet: Droplet;
}) {
  const pdfDoc = await PDFDocument.create();

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const stripHtmlTags = (html: string) => {
    return (
      html
        .replace(/<[^>]*>/g, "")
        // Replace common HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Remove multiple spaces
        .replace(/\s+/g, " ")
        .trim()
    );
  };

  // Helper function to draw lesson icon
  const drawLessonIcon = (x: number, y: number) => {
    page.drawRectangle({
      x: x,
      y: y - 2,
      width: 16,
      height: 16,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 0.5,
    });
    page.drawLine({
      start: { x: x + 4, y: y + 12 },
      end: { x: x + 12, y: y + 12 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawLine({
      start: { x: x + 4, y: y + 8 },
      end: { x: x + 12, y: y + 8 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawLine({
      start: { x: x + 4, y: y + 4 },
      end: { x: x + 12, y: y + 4 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  const calculateLines = (text: string, maxWidth: number, fontSize: number) => {
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.6));
    return Math.ceil(text.length / charsPerLine);
  };

  const drawTextWithBackground = (
    text: string,
    x: number,
    y: number,
    fontSize: number,
    maxWidth: number,
    hasTextBelow: boolean,
    backgroundColor: { r: number; g: number; b: number },
  ) => {
    const lines = calculateLines(text, maxWidth, fontSize);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines * lineHeight;

    if (!hasTextBelow) {
      page.drawLine({
        start: { x: 70, y: y - totalHeight + 5 },
        end: { x: 565, y: y - totalHeight + 5 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    page.drawRectangle({
      x: x,
      y: y - totalHeight + 10,
      width: maxWidth,
      height: totalHeight,
      color: rgb(backgroundColor.r || 0, backgroundColor.g || 0, backgroundColor.b || 0),
    });

    page.drawText(text, {
      x: x,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
      maxWidth: maxWidth,
    });

    return totalHeight;
  };

  const drawText = (
    text: string,
    x: number,
    y: number,
    fontSize: number,
    maxWidth: number,
  ) => {
    const lines = calculateLines(text, maxWidth, fontSize);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines * lineHeight;

    page.drawLine({
      start: { x: 70, y: y - totalHeight + 5 },
      end: { x: 565, y: y - totalHeight + 5 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    page.drawText(text, {
      x: x,
      y: y,
      size: fontSize,
      color: rgb(0, 0, 0),
      maxWidth: maxWidth,
    });

    return totalHeight;
  };

  page.drawText(droplet.name, {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0, 0, 0),
  });

  let yPosition = height - 100;

  const lessonNotes = notes.reduce(
    (acc, note) => {
      const lessonId = note.lesson?.droplet_lessons[0].id;
      if (lessonId) {
        if (!acc[lessonId]) {
          acc[lessonId] = {
            lessonName: note.lesson?.name || "Unknown Lesson",
            notes: [],
            highlights: [],
          };
        }
        acc[lessonId].notes.push(note);
      }
      return acc;
    },
    {} as Record<
      string,
      {
        lessonName: string;
        notes: typeof notes;
        highlights: typeof filteredHighlights;
      }
    >,
  );

  const lessonHighlights = filteredHighlights.reduce((acc, highlight) => {
    const lessonId = highlight.lesson?.droplet_lessons[0].id;
    if (lessonId) {
      if (!acc[lessonId]) {
        acc[lessonId] = {
          lessonName: highlight.lesson?.name || "Unknown Lesson",
          notes: [],
          highlights: [],
        };
      }
      acc[lessonId].highlights.push(highlight);
    }
    return acc;
  }, lessonNotes);

  Object.entries(lessonHighlights).forEach(([lessonId, lessonData]) => {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }

    // Draw lesson icon and name
    drawLessonIcon(50, yPosition);
    page.drawText(lessonData.lessonName, {
      x: 75, // Moved right to accommodate the icon
      y: yPosition,
      size: 18,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;

    if (lessonData.notes.length > 0) {
      page.drawText("Notes:", {
        x: 70,
        y: yPosition,
        size: 14,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
      lessonData.notes.forEach((note) => {
        if (yPosition < 50) {
          page = pdfDoc.addPage([595.28, 841.89]);
          yPosition = height - 50;
        }

        if (note.highlight) {
          const hexColor = note.highlight.color;
          const r = parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = parseInt(hexColor.slice(5, 7), 16) / 255;
          const hasContent =
            note.content !== null && note.content.trim() !== "";

          const highlightHeight = drawTextWithBackground(
            note.highlight.text,
            90,
            yPosition,
            12,
            475,
            hasContent,
            { r, g, b },
          );

          yPosition -= highlightHeight + 10;
        }

        if (note.content && note.content.trim() !== "") {
          const noteHeight = drawText(
            stripHtmlTags(note.content),
            90,
            yPosition,
            12,
            475,
          );

          yPosition -= noteHeight + 10;
        }
      });
    }

    if (lessonData.highlights.length > 0) {
      if (yPosition < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      page.drawText("Highlights:", {
        x: 70,
        y: yPosition,
        size: 14,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
      lessonData.highlights.forEach((highlight) => {
        if (yPosition < 50) {
          page = pdfDoc.addPage([595.28, 841.89]);
          yPosition = height - 50;
        }

        const hexColor = highlight.color;
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;

        const highlightHeight = drawTextWithBackground(
          highlight.text,
          90,
          yPosition,
          12,
          475,
          false,
          { r, g, b },
        );

        yPosition -= highlightHeight + 10;
      });
    }

    yPosition -= 30;
  });

  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
}
