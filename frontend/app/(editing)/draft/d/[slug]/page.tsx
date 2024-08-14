import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: Props) {
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(params.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Draft | ${droplet.name}`,
  };
}

export default async function Droplet({ params }: Props) {
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

  return <div>{droplet.name}</div>;
}
