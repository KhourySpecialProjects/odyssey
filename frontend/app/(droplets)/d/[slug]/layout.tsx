import Sidebar from "@/components/droplets/sidebar";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { Metadata } from "next/types";
import { AuthorizedUser, Droplet } from "@/types";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

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

  if (!user) return notFound();

  let completedLessonIds: number[] = [];
  let authorizedUser: AuthorizedUser | null = null;
  let enrollmentId: string | undefined;

  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  // Fetch droplet first
  const droplet = await getDropletBySlug<Droplet>(slug, {
    fields: ["*"],
    populate: {
      authorized_users: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
    },
  });

  if (!droplet) return notFound();

  if (session?.user?.email) {
    const sessionUser = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(sessionUser.id);

    const currentEnrollment = enrollments.find(
      (enrollment) => enrollment.droplet?.id === droplet.id,
    );

    enrollmentId = currentEnrollment?.id.toString();

    completedLessonIds =
      currentEnrollment?.viewedLessons?.map((lesson) => lesson.id) || [];
  }

  const isAuthor =
    droplet.authorized_users &&
    droplet.authorized_users
      .map((author) => author.id)
      .includes(authorizedUser?.id);

  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar
        author={isAuthor || false}
        user={user}
        droplet={droplet}
        completedLessonIds={completedLessonIds}
        enrollmentId={enrollmentId}
      />
      <main className="w-full flex-1">{children}</main>
    </div>
  );
}
