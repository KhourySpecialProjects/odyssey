import Sidebar from "@/components/droplets/sidebar";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";

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
  const user = await getCurrentUser();

  const droplet = await getDropletBySlug<
    Pick<Droplet, "name" | "slug" | "lessons">
  >(slug, {
    fields: ["name", "slug"],
    populate: ["lessons"],
  });
  if (!droplet) return notFound();

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
