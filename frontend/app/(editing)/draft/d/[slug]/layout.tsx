import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { AuthorizedUser, Droplet } from "@/types";
import { Sidebar } from "@/components/draft/sidebar";
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
    !droplet.authorized_users
      .map((author) => author.id)
      .includes(authorizedUser?.id)
  ) {
    return notFound();
  }

  return (
    <div className="flex min-h-screen flex-col xl:flex-row">
      <Sidebar droplet={droplet} user={user} authorizedUser={authorizedUser} />
      <main className="mx-auto w-full flex-1 items-center justify-center rounded-lg md:border-2 md:border-dashed md:border-slate-200 md:dark:border-slate-700">
        {children}
      </main>
    </div>
  );
}
