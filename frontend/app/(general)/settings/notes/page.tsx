import { Metadata } from "next";
import { getCachedUser } from "@/lib/requests/cached";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllNotesByUser } from "@/lib/requests/notes";
import { getAllHighlightsByUser } from "@/lib/requests/highlights";
import { Note, Highlight } from "@/types";
import { PDFDocument } from "pdf-lib";
import { NoteSummary } from "@/components/droplets/lessons/note-taking/note-summary";
import { NotesManager } from "@/components/droplets/notes-manager";

export const metadata: Metadata = {
  title: "Notes",
};

export default async function NotesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.email) return null;

  const user = await getCachedUser(currentUser.email);
  const [enrollments, allUserNotes, allUserHighlights] = await Promise.all([
    getEnrollmentsByAuthorizedUser(user.id, {
      populate: {
        droplet: {
          populate: {
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
          fields: ["id", "name", "slug"],
        },
      },
    }),
    getAllNotesByUser(user.id),
    getAllHighlightsByUser(user.id),
  ]);

  // Build lessonId -> dropletId map from enrollments
  const lessonToDroplet = new Map<number, number>();
  for (const enrollment of enrollments) {
    for (const lesson of enrollment.droplet.lessons || []) {
      lessonToDroplet.set(lesson.id, enrollment.droplet.id);
    }
  }

  // Group by droplet
  const notesByDroplet = new Map<number, Note[]>();
  for (const note of allUserNotes) {
    const dropletId = lessonToDroplet.get(note.lesson?.id);
    if (dropletId == null) continue;
    if (!notesByDroplet.has(dropletId)) notesByDroplet.set(dropletId, []);
    notesByDroplet.get(dropletId)!.push(note);
  }

  const highlightsByDroplet = new Map<number, Highlight[]>();
  for (const hl of allUserHighlights) {
    if (!hl.lesson?.id) continue;
    const dropletId = lessonToDroplet.get(hl.lesson.id);
    if (dropletId == null) continue;
    if (!highlightsByDroplet.has(dropletId))
      highlightsByDroplet.set(dropletId, []);
    highlightsByDroplet.get(dropletId)!.push(hl);
  }

  // Build allNotes in the same shape as before
  const allNotes = enrollments
    .map((enrollment) => {
      const notes = notesByDroplet.get(enrollment.droplet.id) || [];
      const highlights = (
        highlightsByDroplet.get(enrollment.droplet.id) || []
      ).filter((hl) => !notes.some((n) => n.highlight?.id === hl.id));
      return { dropletId: enrollment.droplet.id, notes, highlights };
    })
    .filter((d) => d.notes.length > 0 || d.highlights.length > 0);

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < enrollments.length; i++) {
    const enrollment = enrollments[i];
    const dropletData = allNotes[i];
    const sectionPdfBytes = await NoteSummary({
      filteredHighlights: dropletData?.highlights || [],
      notes: dropletData?.notes || [],
      droplet: enrollment.droplet,
    });

    const sectionPdfDoc = await PDFDocument.load(sectionPdfBytes);
    const sectionPages = sectionPdfDoc.getPages();

    for (let j = 0; j < sectionPages.length; j++) {
      const [copiedPage] = await pdfDoc.copyPages(sectionPdfDoc, [j]);
      pdfDoc.addPage(copiedPage);
    }
  }

  const initialPdfBytes = await pdfDoc.save();

  return (
    <NotesManager
      enrollments={enrollments}
      allNotes={allNotes ? allNotes : []}
      initialPdfBytes={initialPdfBytes}
    />
  );
}
