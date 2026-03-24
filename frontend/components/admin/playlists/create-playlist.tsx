"use client";

import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

export function CreatePlaylist() {
  return (
    <Link href="/new/playlist">
      <Button className="dark:bg-slate-300" after={<IconPlus />}>
        Create Playlist
      </Button>
    </Link>
  );
}
