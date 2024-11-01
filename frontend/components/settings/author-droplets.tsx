import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDroplets } from "@/lib/requests/droplet";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { DropletTile } from "../droplets/droplet-tile";
import { Button } from "../ui/button";

export async function AuthorDroplets({ authorId }: { authorId: number }) {
  const droplets = await getDroplets({
    filters: { authors: { id: { $eq: authorId } } },
    populate: { authors: { populate: "*" } },
    pagination: {
      page: 1,
      pageSize: 6,
    },
  });

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
          <div className="p-4 text-sm border border-dashed rounded-md border-slate-200">
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

      <CardFooter className="px-6 py-4 border-t">
        <Button after={<ArrowRightIcon />} asChild>
          <Link href="/explore">Explore Droplets</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
