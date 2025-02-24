"use client";

import { Button } from "@/components/ui/button";
import { Playlist } from "@/types";
import { Pencil } from "lucide-react";
import Link from "next/link";

export function PlaylistBlock({ playlist }: { playlist: Playlist }) {
  const linkTo = `/draft/p/${playlist.slug}`;

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-black">
            {playlist.name}
            {playlist.isPublic ? " (Public)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo}>
            <Button size="sm" variant="outline">
              <div className="relative group">
                <Pencil className="text-sky-600" />
                <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit Playlist
                </span>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </li>
  );
}
