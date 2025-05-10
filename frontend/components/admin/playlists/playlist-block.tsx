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
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-slate-300">
            {playlist.name}
            {playlist.isPublic ? " (Public)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Link href={linkTo} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-white dark:bg-slate-300">
              <div className="group relative">
                <Pencil className="text-sky-600" />
                <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
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
