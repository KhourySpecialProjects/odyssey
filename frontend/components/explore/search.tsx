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
      className="flex w-full max-w-sm items-center space-x-2"
      onSubmit={(e) => {
        e.preventDefault();
        setQuery(tempQuery);
      }}
    >
      <Input
        type="search"
        placeholder="Search..."
        className="md:w-[100px] lg:w-[300px]"
        value={tempQuery || ""}
        onChange={(e) => setTempQuery(e.target.value)}
      />
      <Button before={<SearchIcon />} onClick={() => setQuery(tempQuery)}>
        Search
      </Button>
    </form>
  );
}
