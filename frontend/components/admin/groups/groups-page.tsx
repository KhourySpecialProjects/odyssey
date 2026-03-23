import { fetchGroups } from "@/lib/requests/data";
import { GroupsPageClient } from "./groups-page-client";

export async function GroupsPage() {
  const groups = await fetchGroups();
  return <GroupsPageClient groups={groups} />;
}
