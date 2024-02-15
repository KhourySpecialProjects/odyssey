import { authOptions } from "@/lib/authOptions";
import { getDropletBySlug } from "@/lib/droplets";
import { flattenAttributes } from "@/lib/utils";
import DropletFooter from "@/ui/droplets/footer";
import Sidebar from "@/ui/droplets/sidebar";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";

type Props = {
  params: {
    slug: string;
    lessonSlug?: string;
  };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let droplet = await getDropletBySlug(params.slug, {
    authors: "*",
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return {};
  droplet = flattenAttributes(droplet)[0];

  return {
    title: {
      absolute: `Overview | ${droplet.name}`,
      template: `%s | ${droplet.name}`,
    },
  };
}

export default async function RootLayout({ params, children }: Props) {
  const session = await getServerSession(authOptions);

  let droplet = await getDropletBySlug(params.slug, {
    authors: "*",
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return {};
  droplet = flattenAttributes(droplet)[0];

  return (
    <>
      <Sidebar session={session} droplet={droplet} />

      <div className="p-4 sm:ml-64">
        <div className="p-4 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-700">
          {children}

          <DropletFooter droplet={droplet} />
        </div>
      </div>
    </>
  );
}
