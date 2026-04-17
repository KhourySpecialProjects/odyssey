import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FeedCenterContent } from "@/components/feed/feed-center-content";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";

export const metadata: Metadata = {
  title: "Feed",
  description: "Your personalized activity feed.",
};

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  droplets: "/activity/droplets",
  playlists: "/activity/playlists",
  voyages: "/activity/voyages",
  archived: "/activity/archived",
  favorited: "/activity/favorited",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params?.tab;
  if (typeof tab === "string" && LEGACY_TAB_REDIRECTS[tab]) {
    redirect(LEGACY_TAB_REDIRECTS[tab]);
  }

  const user = await getCurrentUser();
  if (!user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  return <FeedCenterContent authUser={authUser} />;
}
