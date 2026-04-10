import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardRoute({ searchParams }: Props) {
  const params = new URLSearchParams();
  const resolved = await searchParams;
  if (resolved) {
    for (const [key, value] of Object.entries(resolved)) {
      if (value !== undefined) {
        params.set(key, Array.isArray(value) ? value.join(",") : value);
      }
    }
  }
  if (!params.has("tab")) {
    params.set("tab", "droplets");
  }
  redirect(`/feed?${params.toString()}`);
}
