"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";

export function ContentTypeSelector({
  droplets,
  playlists,
}: {
  droplets: number;
  playlists: number;
}) {
  const contentTypes = [
    { name: `Droplets (${droplets})`, value: "droplets" },
    { name: `Playlists (${playlists})`, value: "playlists" },
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("contentType") || "droplets";

  const createQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("contentType", value);
    return params.toString();
  };

  return (
    <div className="flex gap-2">
      {contentTypes.map((type) => (
        <Button
          key={type.value}
          className={
            currentType === type.value
              ? "h-10 w-24 bg-black dark:border dark:border-slate-900 dark:bg-white dark:text-black dark:hover:bg-slate-300"
              : "h-10 w-24 border border-slate-500 bg-white text-black hover:bg-slate-100 dark:bg-black dark:text-white dark:hover:bg-slate-900"
          }
          onClick={() => {
            router.push(`${pathname}?${createQueryString(type.value)}`);
          }}
        >
          {type.name}
        </Button>
      ))}
    </div>
  );
}
