import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getDroplets } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import Link from "next/link";
import { Badge } from "../ui/badge";

export async function DropletsGrid({
  sortKey,
  searchValue,
  type,
  focusArea,
  tags,
}: {
  searchValue?: string;
  sortKey?: string;
  type?: string;
  focusArea?: string;
  tags?: string;
}) {
  const droplets = await getDroplets({
    sort: sortKey,
    filters: {
      $and: [
        searchValue ? { name: { $containsi: searchValue } } : {},
        type
          ? { $or: type.split(",").map((val) => ({ type: { $eq: val } })) }
          : {},
        focusArea
          ? {
              $or: focusArea
                .split(",")
                .map((val) => ({ focusArea: { $eq: val } })),
            }
          : {},
        tags
          ? {
              $or: tags
                .split(",")
                .map((val) => ({ tags: { slug: { $eq: val } } })),
            }
          : {},
      ],
    },
    populate: "tags",
  });

  const formatBadge = (label: string) => {
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  if (!droplets || droplets.length === 0) {
    return (
      <Message className="mb-8 border border-dashed border-slate-200 rounded-md">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          There are no Droplets that match &quot;{searchValue}&quot;.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <div className="mb-8 max-w-5xl mx-auto w-full">
      <ul className="grid grid-flow-row gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {droplets.map((droplet: Droplet) => (
          <li
            className="bg-slate-50 rounded-md aspect-video transition-colors border border-slate-200 hover:border-slate-300"
            key={droplet.id}
          >
            <Link
              className="relative inline-flex h-full w-full p-8"
              href={`/d/${droplet.slug}`}
            >
              <div className="flex flex-col gap-2 justify-end">
                <div className="flex flex-row flex-0 gap-1.5">
                  <Badge variant="outline">
                    {formatBadge(droplet.focusArea)}
                  </Badge>
                  <Badge variant="outline">{formatBadge(droplet.type)}</Badge>
                  {droplet.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <span className="text-4xl font-black place-self-end">
                  {droplet.name}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
