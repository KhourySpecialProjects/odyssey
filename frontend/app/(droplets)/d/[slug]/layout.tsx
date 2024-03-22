import DropletFooter from "@/components/droplets/footer";
import { ReportBugDialog } from "@/components/droplets/reports/bug/dialog";
import Sidebar from "@/components/droplets/sidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { flattenAttributes } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  const user = await getCurrentUser();

  let droplet = await getDropletBySlug(params.slug, {
    authors: "*",
    lessons: {
      populate: "*",
    },
  });
  if (droplet.data.length === 0) return notFound();
  droplet = flattenAttributes(droplet)[0];

  return (
    <>
      <Sidebar user={user} droplet={droplet} />

      <div className="p-4 sm:ml-64">
        <div className="p-4 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-700">
          {children}

          <DropletFooter droplet={droplet} />
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <ReportBugDialog user={user} />
      </div>
    </>
  );
}
