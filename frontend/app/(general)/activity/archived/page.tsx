import { Metadata } from "next";
import { ActivityTabContent } from "@/components/feed/activity-tab-content";

export const metadata: Metadata = {
  title: "Archived",
  description: "View and manage your archived content.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ArchivedPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  return <ActivityTabContent contentType="archived" searchParams={params} />;
}
