"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";

export function Search() {
  const [tempQuery, setTempQuery] = useState("");
  const [_, setQuery] = useQueryState("q", {
    shallow: false,
    throttleMs: 1000,
    clearOnDefault: true,
  });

  return (
    <form
      className="flex items-center space-x-2 xs:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setQuery(tempQuery);
      }}
    >
      <Input
        type="search"
        placeholder="Search..."
        className="w-full md:w-[125px] lg:w-[300px]"
        value={tempQuery || ""}
        onChange={(e) => setTempQuery(e.target.value)}
      />
      <Button before={<SearchIcon />} onClick={() => setQuery(tempQuery)}>
        <span className="sr-only md:not-sr-only">Search</span>
      </Button>
    </form>
  );
}
