"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StudentProgressListProps {
  playlists: {
    id: number;
    name: string;
    slug: string;
    authorized_users: {
      id: number;
      email: string;
      progress: number;
    }[];
  }[];
}

export function StudentProgressList({ playlists }: StudentProgressListProps) {
  const [openPlaylists, setOpenPlaylists] = useState<number[]>([]);

  const togglePlaylist = (playlistId: number) => {
    setOpenPlaylists((current) =>
      current.includes(playlistId)
        ? current.filter((id) => id !== playlistId)
        : [...current, playlistId],
    );
  };

  const exportProgress = (
    playlistName: string,
    users: { email: string; progress: number }[],
  ) => {
    // Convert progress to decimal (e.g., 31% becomes 0.31)
    const data = users.map((user) => ({
      email: user.email,
      progress: (user.progress / 100).toFixed(2),
    }));

    const csvContent = [
      "email,progress",
      ...data.map((row) => `${row.email},${row.progress}`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${playlistName.toLowerCase().replace(/\s+/g, "-")}-progress.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!playlists || playlists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        You haven&apos;t created any private playlists yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {playlists.map((playlist) => (
        <Collapsible
          key={playlist.id}
          open={openPlaylists.includes(playlist.id)}
          onOpenChange={() => togglePlaylist(playlist.id)}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-medium">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.authorized_users.length} enrolled student
                    {playlist.authorized_users.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openPlaylists.includes(playlist.id)
                      ? "transform rotate-180"
                      : "",
                  )}
                />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent collapsible from toggling
                      exportProgress(playlist.name, playlist.authorized_users);
                    }}
                    className="w-full mb-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Progress as CSV
                  </Button>
                  {playlist.authorized_users.map((user) => (
                    <div key={user.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{user.email}</span>
                        <span>{user.progress}%</span>
                      </div>
                      <Progress value={user.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
