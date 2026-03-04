import Sidebar from "@/components/droplets/sidebar";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
} from "@/lib/requests/cached";
import { Metadata } from "next/types";
import { AuthorizedUser } from "@/types";
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
  const droplet = await getCachedDropletBySlug(p.slug);
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
  const [user, droplet] = await Promise.all([
    getCurrentUser(),
    getCachedDropletBySlug(slug),
  ]);

  if (!user) return notFound();
  if (!droplet) return notFound();

  let completedLessonIds: number[] = [];
  let authorizedUser: AuthorizedUser | null = null;
  let enrollmentId: string | undefined;

  if (user?.email) {
    authorizedUser = (await getCachedUser(user.email)) as AuthorizedUser;
    const enrollments = await getCachedEnrollmentsWithLessonIds(
      authorizedUser.id,
    );

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
