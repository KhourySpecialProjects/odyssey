import { DropletLayoutShell } from "@/components/droplets/droplet-layout-shell";
import {
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
} from "@/lib/requests/cached";
import { Metadata } from "next/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
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
  const user = await getCurrentUser();
  if (!user) return notFound();

  const userId = await getAuthorizedUserId(user);
  const [droplet, enrollments] = await Promise.all([
    getCachedDropletBySlug(slug),
    userId ? getCachedEnrollmentsWithLessonIds(userId) : [],
  ]);

  if (!droplet) return notFound();

  const currentEnrollment = enrollments.find(
    (enrollment) => enrollment.droplet?.id === droplet.id,
  );
  const enrollmentId = currentEnrollment?.id.toString();
  const completedLessonIds =
    currentEnrollment?.viewedLessons?.map((lesson) => lesson.id) || [];

  const isAuthor =
    droplet.authorized_users &&
    droplet.authorized_users.map((author) => author.id).includes(userId);

  return (
    <DropletLayoutShell
      author={isAuthor || false}
      user={user}
      droplet={droplet}
      completedLessonIds={completedLessonIds}
      enrollmentId={enrollmentId}
    >
      {children}
    </DropletLayoutShell>
  );
}
