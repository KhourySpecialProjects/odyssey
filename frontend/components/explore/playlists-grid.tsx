"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";

interface Playlist {
  id: number;
  attributes: {
    name: string;
    slug: string;
    isPublic: boolean;
    droplets: {
      data: Array<{
        id: number;
        attributes: {
          name: string;
        };
      }>;
    };
  };
}

export function PlaylistsGrid() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      const response = await fetch(
        `${process.env.STRAPI_API_URL}/api/playlists?populate=droplets&filters[isPublic][$eq]=true`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );
      const data = await response.json();
      setPlaylists(data.data);
    };

    fetchPlaylists();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {playlists.map((playlist) => (
        <Link
          key={playlist.id}
          href={`/playlists/${playlist.attributes.slug}`}
          className="transition-transform hover:scale-105"
        >
          <Card>
            <CardHeader>
              <CardTitle>{playlist.attributes.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {playlist.attributes.droplets.data.length} droplets
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
} 