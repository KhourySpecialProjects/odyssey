"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ContentTypeSelector({
  droplets,
  playlists,
  voyages,
}: {
  droplets: number;
  playlists: number;
  voyages: number;
}) {
  const contentTypes = [
    { name: `Droplets (${droplets})`, value: "droplets" },
    { name: `Playlists (${playlists})`, value: "playlists" },
    { name: `Voyages (${voyages})`, value: "voyages" },
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
        <button
          key={type.value}
          onClick={() => {
            router.push(`${pathname}?${createQueryString(type.value)}`);
          }}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            currentType === type.value
              ? "border-[#287697] bg-[#287697] text-white"
              : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
          )}
        >
          {type.name}
        </button>
      ))}
    </div>
  );
}
