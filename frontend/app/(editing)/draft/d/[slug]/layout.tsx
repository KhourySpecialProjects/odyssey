import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { AuthorizedUser, Droplet } from "@/types";
import { Sidebar } from "@/components/draft/sidebar";
import { getCachedUser } from "@/lib/requests/cached";
import { getDroplets } from "@/lib/requests/droplet";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

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

  const [cachedUser, droplet, availableDroplets] = await Promise.all([
    user?.email ? getCachedUser(user.email) : Promise.resolve(null),
    getDropletBySlug<Droplet>(p.slug, {
      fields: ["*"],
      populate: {
        authorized_users: { populate: "*" },
        learningObjectives: { populate: "*" },
        lessons: { populate: "*" },
        tags: { populate: "*" },
        prerequisites: { populate: ["id", "name", "slug"] },
        postrequisites: { populate: ["id", "name", "slug"] },
      },
    }),
    getDroplets({
      fields: ["id", "name", "slug"],
      populate: {
        lessons: {
          fields: ["id", "name", "slug", "type", "orderIndex"],
        },
      },
      filters: {
        status: "published", // Only show published droplets
      },
    }),
  ]);

  if (cachedUser) {
    authorizedUser = cachedUser as AuthorizedUser;
  }

  if (!droplet || !user || !droplet.authorized_users || !user.email) {
    return notFound();
  }

  // Check if user is Admin, Content Editor, or an authorized author
  const isAdmin = isAuthorizedUserAdmin(user.roles);
  const isContentEditor = user.roles?.includes(
    AuthorizedUserRoleTitle.ContentEditor,
  );
  const isAuthor = droplet.authorized_users
    .map((author) => author.id)
    .includes(authorizedUser?.id);

  if (!isAdmin && !isContentEditor && !isAuthor) {
    return notFound();
  }

  return (
    <div className="flex min-h-screen flex-col md:border-2 md:border-dashed md:border-slate-200 xl:flex-row md:dark:border-slate-700">
      <Sidebar
        droplet={droplet}
        user={user}
        availableDroplets={availableDroplets}
      />
      <main className="mx-auto w-full flex-1 items-center justify-center rounded-lg">
        {!droplet.inReview ? (
          <div className="bg-red-100 p-1 text-center dark:bg-red-100 dark:text-black">
            ** Information that you enter will be saved automatically. **
          </div>
        ) : (
          <div className="bg-orange-300 p-1 text-center dark:bg-orange-300 dark:text-black">
            ** This droplet is currently in review **
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
