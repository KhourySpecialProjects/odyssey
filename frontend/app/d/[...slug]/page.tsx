import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { DropletRenderer } from "@/ui/droplets/droplet-renderer";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
  };
};

export async function getDropletBySlug(slug: string) {
  const path = `/droplets`;
  const urlParamsObject = { filters: { slug }, populate: "authors" };
  const options = {
    headers: { Authorization: "Bearer " + process.env.STRAPI_ACCESS_TOKEN },
  };
  return await fetchAPI(path, urlParamsObject, options);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const droplet = flattenAttributes(await getDropletBySlug(params.slug));
  if (droplet.length === 0) return notFound();

  return {
    title: droplet[0].name,
  };
}

export default async function DropletRoute({ params }: Props) {
  const droplet = flattenAttributes(await getDropletBySlug(params.slug));
  if (droplet.length === 0) return notFound();

  return <DropletRenderer droplet={droplet[0]} />;
}
