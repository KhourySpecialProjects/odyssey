import DropletFooter from "@/components/droplets/footer";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<Params>;
  children: React.ReactNode;
};

type Params = {
  slug: string;
  lessonSlug?: string;
};

export default async function RootLayout({ params, children }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Pick<Droplet, "slug" | "droplet_lessons">>(
    p.slug,
    {
      fields: ["slug"],
      populate: ["lessons"],
    },
  );
  if (!droplet) return notFound();

  return (
    <>
      {children}

      <DropletFooter droplet={droplet} />
    </>
  );
}
