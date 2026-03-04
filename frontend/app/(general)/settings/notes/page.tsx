import { Metadata } from "next";
import { getCachedUser } from "@/lib/requests/cached";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";
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
  const enrollments = await getEnrollmentsByAuthorizedUser(user.id, {
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
  });

  const authUser = await getCachedUser(user.email);

  const defined = <T,>(v: T | null | undefined): v is T => v != null;

  const allNotes = (
    await Promise.all(
      enrollments.map(async (enrollment) => {
        if (!enrollment) return null;
        const dropletNotes = await getNotesByDroplet(
          authUser.id,
          enrollment.droplet.id,
        );
        const dropletHighlights = await getHighlightsByDroplet(
          authUser.id,
          enrollment.droplet.id,
        );

        return {
          dropletId: enrollment.droplet.id,
          notes: dropletNotes,
          highlights: dropletHighlights.filter(
            (highlight) =>
              !dropletNotes.some(
                (lesson) => lesson.highlight?.id === highlight.id,
              ),
          ),
        };
      }),
    )
  ).filter(defined);

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
