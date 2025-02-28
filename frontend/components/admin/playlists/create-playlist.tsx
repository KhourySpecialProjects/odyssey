"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export function CreatePlaylist() {
  return (
    <Link href="/new/playlist">
      <Button className="dark:bg-slate-300" after={<PlusIcon />}>
        Create Playlist
      </Button>
    </Link>
  );
}
