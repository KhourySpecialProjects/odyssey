import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";
import { Card } from "@/components/ui/card";
import { NotesContainer } from "@/components/droplets/notes-container";

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
      droplet_lessons: {
        populate: {
          lesson: {
            fields: ["id", "name", "slug"],
          },
        },
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
            droplet_lessons: {
              populate: {
                // Add this nested populate
                lesson: {
                  fields: ["id", "name", "slug"],
                },
              },
            },
          },
        },
      },
    });

    const authUser = await getAuthorizedUserByEmail(user.email);

    const allNotes = await Promise.all(
      enrollments.map(async (enrollment) => {
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
          highlights: dropletHighlights,
        };
      }),
    );

    return (
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className=" text-6xl font-black text-slate-900 dark:text-white">
            Saved Notes
          </h1>
          <p className="dark:text-slate-300">
            A collection of notes and highlights that you have created
          </p>
        </div>
        <div className="w-full max-w-2xl py-8 mx-auto space-y-4 ">
          {enrollments.map((enrollment, index) => {
            const dropletData = allNotes[index];
            const dropletNotes = dropletData.notes;
            const dropletHighlights = dropletData.highlights;

            return (
              <Card className="dark:bg-slate-800 p-2">
                <Link href={`/d/${enrollment.droplet.slug}`}>
                  <div className="text-2xl text-center font-bold">
                    {enrollment.droplet.name}
                  </div>
                </Link>
                <NotesContainer
                  allNotes={allNotes[index]}
                  dropletHighlights={dropletHighlights}
                  dropletNotes={dropletNotes}
                  mappedLessons={enrollment.droplet.droplet_lessons}
                />
              </Card>
            );
          })}
        </div>
      </>
    );
  }
}
