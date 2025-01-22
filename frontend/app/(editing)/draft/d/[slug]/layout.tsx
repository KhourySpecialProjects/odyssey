import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isContentCreator, isAuthorizedUserAdmin } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { Sidebar } from "@/components/draft/sidebar";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import { DebugBanner } from "@/components/debug/debugBanner";

type params = {
  slug: string;
};

type Props = {
  params: Promise<params>;
  children: React.ReactNode;
};

export default async function CheckPermission({ params, children }: Props) {
  const user = await getCurrentUser();
  const p = await params;

  const droplet = await getDropletBySlug<Droplet>(p.slug, {
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
  if (
    !droplet ||
    !user ||
    !droplet.authors ||
    !user.email ||
    !(isContentCreator(user.roles) && isAuthorizedUserAdmin(user.roles))
  ) {
    return notFound();
  }
  const userAuthor = await getAuthorByAuthorizedUserEmail(user.email);

  if (
    !isAuthorizedUserAdmin(user.roles) &&
    !droplet.authors.map((author) => author.id).includes(userAuthor.id)
  ) {
    return notFound();
  }

  return (
    <>
      <DebugBanner />
      <EnvironmentBanner className="mb-2" />
      <Sidebar droplet={droplet} user={user} />
      <div className="md:ml-64">
        <div className="p-6 rounded-lg sm:p-8 md:py-10 md:m-4 md:border-dashed md:border-2 md:border-slate-200 md:dark:border-slate-700 mx-auto flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </>
  );
}
