import { Metadata } from "next";
import { ActivityTabContent } from "@/components/feed/activity-tab-content";

export const metadata: Metadata = {
  title: "My Playlists",
  description: "View and manage your saved playlists.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MyPlaylistsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  return <ActivityTabContent contentType="playlists" searchParams={params} />;
}
