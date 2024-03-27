import DropletFooter from "@/components/droplets/footer";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug?: string;
  };
  children: React.ReactNode;
};

export default async function RootLayout({ params, children }: Props) {
  const droplet = await getDropletBySlug<Pick<Droplet, "lessons">>(
    params.slug,
    {
      fields: [],
      populate: ["lessons"],
    }
  );
  if (!droplet) return notFound();

  return (
    <>
      {children}

      <DropletFooter droplet={droplet} />
    </>
  );
}
