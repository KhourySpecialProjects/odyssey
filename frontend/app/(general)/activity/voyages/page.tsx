import { Metadata } from "next";
import { ActivityTabContent } from "@/components/feed/activity-tab-content";

export const metadata: Metadata = {
  title: "My Voyages",
  description: "View and manage your learning voyages.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MyVoyagesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  return <ActivityTabContent contentType="voyages" searchParams={params} />;
}
