import { redirect } from "next/navigation";

const TAB_TO_PATH: Record<string, string> = {
  feed: "/activity",
  droplets: "/activity/droplets",
  playlists: "/activity/playlists",
  voyages: "/activity/voyages",
  archived: "/activity/archived",
  favorited: "/activity/favorited",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardRoute({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {};
  const tabValue = resolved.tab;
  const tab = Array.isArray(tabValue) ? tabValue[0] : tabValue;
  const basePath = (tab && TAB_TO_PATH[tab]) || "/activity/droplets";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (key === "tab" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(qs ? `${basePath}?${qs}` : basePath);
}
