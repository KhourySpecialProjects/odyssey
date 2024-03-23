import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getDroplets } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import Link from "next/link";

export async function DropletsGrid({
  sortKey,
  searchValue,
  type,
  focusArea,
}: {
  searchValue?: string;
  sortKey: string;
  type: string;
  focusArea: string;
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
      ],
    },
  });

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
        {droplets.map((droplet: Pick<Droplet, "id" | "slug" | "name">) => (
          <li
            className="bg-slate-50 rounded-md aspect-video transition-colors border border-slate-200 hover:border-slate-300"
            key={droplet.id}
          >
            <Link
              className="relative inline-flex h-full w-full p-8"
              href={`/d/${droplet.slug}`}
            >
              <span className="text-4xl font-black place-self-end">
                {droplet.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
