import Sidebar from "@/components/droplets/sidebar";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";

export default async function DropletLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const session = await getServerSession();
  let completedLessonIds: number[] = [];

  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson) => lesson.id) || [],
    );
  }

  const droplet = await getDropletBySlug(params.slug);

  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar
        user={session?.user}
        droplet={droplet}
        completedLessonIds={completedLessonIds}
      />
      <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
