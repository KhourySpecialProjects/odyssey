import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { AuthorizedUser, Droplet } from "@/types";
import { Sidebar } from "@/components/draft/sidebar";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import { DebugBanner } from "@/components/debug/debugBanner";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

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
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  const droplet = await getDropletBySlug<Droplet>(p.slug, {
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
  if (!droplet || !user || !droplet.authorized_users || !user.email) {
    return notFound();
  }

  if (
    !isAuthorizedUserAdmin(user.roles) &&
    !droplet.authorized_users.map((author) => author.id).includes(authorizedUser?.id)
  ) {
    return notFound();
  }

  return (
    <>
      <DebugBanner />
      <EnvironmentBanner className="mb-2" />
      <Sidebar droplet={droplet} user={user} authorizedUser={authorizedUser} />
      <div className="md:ml-64">
        <div className="p-6 rounded-lg sm:p-8 md:py-10 md:m-4 md:border-dashed md:border-2 md:border-slate-200 md:dark:border-slate-700 mx-auto flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </>
  );
}
