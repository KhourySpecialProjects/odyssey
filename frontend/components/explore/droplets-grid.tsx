import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getDroplets } from "@/lib/requests/droplet";
import { uppercaseFirstChar } from "@/lib/utils";
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

  if (!droplets || droplets.length === 0) {
    return (
      <Message className="mb-8 border border-dashed rounded-md border-slate-200">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          There are no Droplets that match &quot;{searchValue}&quot;.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mb-8">
      <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {droplets.map((droplet: Droplet) => (
          <li
            className="transition-colors border rounded-md bg-slate-50 aspect-video border-slate-200 hover:border-slate-300"
            key={droplet.id}
          >
            <Link
              className="relative inline-flex w-full h-full p-8"
              href={`/d/${droplet.slug}`}
            >
              <div className="flex flex-col justify-end gap-2">
                <div className="flex flex-row flex-0 gap-1.5">
                  <Badge variant="outline">
                    {uppercaseFirstChar(droplet.focusArea)}
                  </Badge>
                  <Badge variant="outline">
                    {uppercaseFirstChar(droplet.type)}
                  </Badge>
                  {droplet.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <span className="block w-full text-4xl font-black place-self-end">
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
