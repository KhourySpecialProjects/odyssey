"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DropletTile } from "../droplets/droplet-tile";
import { AuthorizedUser } from "@/types";

export function AuthorDroplets({ author }: { author: AuthorizedUser }) {
  const droplets = author.droplets;

  return (
    <Card className="border hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
      <CardHeader>
        <CardTitle>Droplets</CardTitle>
        <CardDescription className="dark:text-white">
          Here is a quick overview of some of your Droplets.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!droplets || droplets.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm dark:border-slate-500 dark:text-slate-300">
            You have no Droplets.
          </div>
        ) : (
          <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {droplets.map((droplet) => (
              <DropletTile key={droplet.id} droplet={droplet} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
