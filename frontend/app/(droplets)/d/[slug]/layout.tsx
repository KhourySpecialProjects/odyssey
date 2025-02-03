import Sidebar from "@/components/droplets/sidebar";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { Metadata } from "next/types";
import { AuthorizedUser, Droplet } from "@/types";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";

type Props = {
  params: Promise<Params>;
  children: React.ReactNode;
};

type Params = {
  slug: string;
  lessonSlug?: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(p.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: {
      absolute: `Overview | ${droplet.name}`,
      template: `%s | ${droplet.name}`,
    },
  };
}

export default async function RootLayout({ params, children }: Props) {
  const { slug } = await params;
  const session = await getServerSession();
  const user = await getCurrentUser();
  let completedLessonIds: number[] = [];
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson) => lesson.id) || [],
    );
  }

  const droplet = await getDropletBySlug<Droplet>(slug, {
    fields: ["*"],
    populate: {
      authors: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
    },
  });

  if (!droplet || !user) return notFound();

  const userAuthor = await getAuthorByAuthorizedUserEmail(user.email || "");

  const isAuthor =
    userAuthor &&
    droplet.authors &&
    droplet.authors.map((author) => author.id).includes(userAuthor.id);

  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar
        author={isAuthor || false}
        user={user}
        droplet={droplet}
        authorizedUser={authorizedUser}
        completedLessonIds={completedLessonIds}
      />
      <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
