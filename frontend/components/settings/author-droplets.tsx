"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { DropletTile } from "../droplets/droplet-tile";
import { Button } from "../ui/button";
import { AuthorizedUser } from "@/types";

export function AuthorDroplets({ author }: { author: AuthorizedUser }) {
  const droplets = author.droplets;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Droplets</CardTitle>
        <CardDescription>
          Here is a quick overview of some of your Droplets.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!droplets || droplets.length === 0 ? (
          <div className="p-4 text-sm border border-dashed rounded-md border-slate-200 dark:border-slate-500 dark:text-slate-300">
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

      <CardFooter className="px-6 py-4 border-t dark:border-slate-800">
        <Button after={<ArrowRightIcon />} asChild>
          <Link href="/explore">Explore</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
