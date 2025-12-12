import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";
import { PDFDocument } from "pdf-lib";
import { NoteSummary } from "@/components/droplets/lessons/note-taking/note-summary";
import { NotesManager } from "@/components/droplets/notes-manager";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      tags: { populate: "*" },
      nextSteps: { populate: "*" },
      lessons: {
        fields: ["id", "name", "slug"],
      },
    },
  });

  if (!droplet) {
    console.error("not found");
    return notFound();
  }

  return {
    title: `Recap | ${droplet.name}`,
  };
}

export default async function DropletRecapRoute({ params }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      tags: { populate: "*" },
      nextSteps: { populate: "*" },
    },
  });
  if (!droplet) {
    console.error("not found");
    return notFound();
  }

  const session = await getServerSession();
  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id, {
      populate: {
        viewedLessons: {
          fields: ["id", "name", "slug"],
        },
        droplet: {
          populate: {
            lessons: {
              fields: ["id", "name", "slug"],
            },
            tags: {
              fields: ["*"],
            },
            usersFavorited: {
              fields: "*",
            },
          },
          fields: ["id", "*"],
        },
      },
    });

    const authUser = await getAuthorizedUserByEmail(user.email);

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
          // console.log(`Enrollment ${enrollment.id}, Droplet ${enrollment.droplet.id}: ${dropletHighlights.length} highlights found`);
          // console.log(`Lessons in droplet: ${enrollment.droplet.lessons?.map(l => l.id).join(', ')}`);

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
}
