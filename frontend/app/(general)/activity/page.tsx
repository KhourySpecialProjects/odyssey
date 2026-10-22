import { Suspense } from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FeedCenterContent } from "@/components/feed/feed-center-content";
import {
  parseFilters,
  toFeedRoles,
} from "@/components/feed/feed-filter-params";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";
import {
  type FeedPage as FeedPageData,
  fetchAnnouncements,
} from "@/lib/requests/feed";
import { AnnouncementType, AuthorizedUser } from "@/types";

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

  // Page 1 of the Unread tab for the URL's filters (same parse the client
  // uses), started before the social-graph await so the two overlap. A failed
  // fetch resolves to null and the client fetches it instead.
  const filters = params?.filters;
  const roles = toFeedRoles(
    parseFilters((Array.isArray(filters) ? filters[0] : filters) ?? null),
  );
  const initialPage =
    roles.length > 0
      ? fetchAnnouncements(1, roles, { archived: false }).catch((error) => {
          console.error("Error prefetching feed:", error);
          return null;
        })
      : Promise.resolve(null);

  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  return (
    <Suspense fallback={<FeedCenterContent authUser={authUser} pending />}>
      <SeededFeed authUser={authUser} roles={roles} initialPage={initialPage} />
    </Suspense>
  );
}

async function SeededFeed({
  authUser,
  roles,
  initialPage,
}: {
  authUser: AuthorizedUser;
  roles: AnnouncementType[];
  initialPage: Promise<FeedPageData | null>;
}) {
  const page = await initialPage;
  return (
    <FeedCenterContent
      authUser={authUser}
      initialFeed={page ? { roles, page } : undefined}
    />
  );
}
