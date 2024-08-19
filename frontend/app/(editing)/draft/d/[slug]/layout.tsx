import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isContentCreator } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { Sidebar } from "@/components/draft/sidebar";

type Props = {
  params: {
    slug: string;
  };
  children: React.ReactNode;
};

export default async function CheckPermission({ params, children }: Props) {
  const user = await getCurrentUser();
  const droplet = await getDropletBySlug<Droplet>(params.slug, {
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
    !isContentCreator(user.roles)
  )
    return notFound();
  const userAuthor = await getAuthorByAuthorizedUserEmail(user.email);

  if (!droplet.authors.map((author) => author.id).includes(userAuthor.id)) {
    return notFound();
  }

  return (
    <>
      <Sidebar droplet={droplet} user={user} />
      <div className="md:ml-64">
        <div className="p-6 rounded-lg sm:p-8 md:py-10 md:m-4 md:border-dashed md:border-2 md:border-slate-200 md:dark:border-slate-700">
          {children}
        </div>
      </div>
    </>
  );
}
