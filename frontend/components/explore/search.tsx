"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function Search() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tempQuery, setTempQuery] = useState(searchParams.get("q") || "");

  const updateQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form
      className="flex items-center space-x-2 xs:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        updateQueryString(tempQuery);
      }}
    >
      <Input
        type="search"
        placeholder="Search..."
        className="w-full md:w-[125px] lg:w-[300px]"
        value={tempQuery}
        onChange={(e) => setTempQuery(e.target.value)}
      />
      <Button
        before={<SearchIcon />}
        onClick={() => updateQueryString(tempQuery)}
        className="dark:bg-slate-300"
      >
        <span className="sr-only md:not-sr-only">Search</span>
      </Button>
    </form>
  );
}
