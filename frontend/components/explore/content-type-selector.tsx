"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";

const contentTypes = [
  { label: "Droplets", value: "droplets" },
  { label: "Playlists", value: "playlists" },
];

export function ContentTypeSelector() {
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
          variant={currentType === type.value ? "default" : "outline"}
          onClick={() => {
            router.push(`${pathname}?${createQueryString(type.value)}`);
          }}
        >
          {type.label}
        </Button>
      ))}
    </div>
  );
}
