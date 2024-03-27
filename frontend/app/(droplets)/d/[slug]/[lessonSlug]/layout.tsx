import DropletFooter from "@/components/droplets/footer";
import { deprecated__getDropletBySlug } from "@/lib/requests/droplet";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug?: string;
  };
  children: React.ReactNode;
};

export default async function RootLayout({ params, children }: Props) {
  let droplet = await deprecated__getDropletBySlug(params.slug, {
    lessons: {
      populate: "*",
    },
  });
  if (!droplet) return notFound();

  return (
    <>
      {children}

      <DropletFooter droplet={droplet} />
    </>
  );
}
