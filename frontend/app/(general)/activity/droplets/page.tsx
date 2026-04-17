import { Metadata } from "next";
import { ActivityTabContent } from "@/components/feed/activity-tab-content";

export const metadata: Metadata = {
  title: "My Droplets",
  description: "View and manage your enrolled droplets.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MyDropletsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  return <ActivityTabContent contentType="droplets" searchParams={params} />;
}
