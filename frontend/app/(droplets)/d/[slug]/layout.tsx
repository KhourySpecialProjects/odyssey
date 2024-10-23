import { DebugBanner } from "@/components/debug/debugBanner";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
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
    populate: undefined,
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

      <div className="md:ml-64">
        <DebugBanner />
        <EnvironmentBanner className="mb-2" />

        <div className="p-6 rounded-lg sm:p-8 md:py-10 md:m-4 md:border-dashed md:border-2 md:border-slate-200 md:dark:border-slate-700">
          {children}
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <ReportBugDialog user={user} />
      </div>
    </>
  );
}
