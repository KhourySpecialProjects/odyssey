import { DebugBanner } from "@/components/debug/banner";
import { ReportBugDialog } from "@/components/droplets/reports/bug/dialog";
import Sidebar from "@/components/droplets/sidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
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
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(params.slug, {
    fields: ["name"],
  });
  if (!droplet) return {};

  return {
    title: {
      absolute: `Overview | ${droplet.name}`,
      template: `%s | ${droplet.name}`,
    },
  };
}

export default async function RootLayout({ params, children }: Props) {
  const user = await getCurrentUser();

  const droplet = await getDropletBySlug<
    Pick<Droplet, "name" | "slug" | "lessons">
  >(params.slug, {
    fields: ["name", "slug"],
    populate: ["lessons"],
  });
  if (!droplet) return notFound();

  return (
    <>
      <Sidebar user={user} droplet={droplet} />

      <div className="sm:ml-64">
        <DebugBanner className="mb-2" />

        <div className="p-4 m-4 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-700">
          {children}
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <ReportBugDialog user={user} />
      </div>
    </>
  );
}
