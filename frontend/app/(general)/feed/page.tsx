import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function FeedRedirect({ searchParams }: Props) {
  const params = new URLSearchParams();
  const resolved = await searchParams;
  if (resolved) {
    for (const [key, value] of Object.entries(resolved)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
      } else {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  redirect(qs ? `/activity?${qs}` : "/activity");
}
