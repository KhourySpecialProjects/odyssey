import { Metadata } from "next";
import { ActivityTabContent } from "@/components/feed/activity-tab-content";

export const metadata: Metadata = {
  title: "My Favorited",
  description: "View and manage your favorited droplets.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MyFavoritedPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  return <ActivityTabContent contentType="favorited" searchParams={params} />;
}
