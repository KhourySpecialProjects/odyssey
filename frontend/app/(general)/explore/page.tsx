import { DropletsGrid } from "@/components/explore/droplets-grid";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Filter } from "@/components/explore/filter";
import { Search } from "@/components/explore/search";
import { Sort } from "@/components/explore/sort";
import { TagFilter } from "@/components/explore/tag-filter";
import {
  defaultSort,
  DROPLET_FILTERS,
  playlistSorting,
  sorting,
} from "@/lib/globals";
import { Metadata } from "next";
import { Suspense } from "react";
import { ContentTypeSelector } from "@/components/explore/content-type-selector";
import { PlaylistsGrid } from "@/components/explore/playlists-grid";
import { getDroplets } from "@/lib/requests/droplet";
import { getPlaylists } from "@/lib/requests/playlist";
import { SearchProvider } from "@/contexts/SearchContext";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover content on Khoury Odyssey.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const {
    sort,
    type,
    focusArea,
    tags,
    contentType = "droplets",
  } = (await searchParams) as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;
  const droplets = await getDroplets({
    filters: {
      $and: [
        { status: { $eq: "published" } },
        { isHidden: false },
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
    populate: {
      lessons: {
        fields: ["*"],
        populate: {
          blocks: {
            on: {
              "droplets.generic": {
                populate: "*",
              },
              "droplets.expandable": {
                populate: "*",
              },
              "droplets.callout": {
                populate: "*",
              },
              "droplets.video": {
                populate: "*",
              },
              "droplets.quiz": {
                populate: {
                  questions: {
                    populate: {
                      answerOptions: true,
                    },
                  },
                },
              },
              "droplets.open-ended-quiz": {
                populate: {
                  questions: true,
                },
              },
            },
          },
        },
      },
      tags: {
        fields: ["*"],
      },
      authorized_users: {
        fields: ["firstName", "lastName", "email"],
      },
      learningObjectives: {
        fields: ["objective"],
      },
      nextSteps: {
        fields: ["label", "url"],
      },
      prerequisites: {
        fields: ["name"],
      },
      postrequisites: {
        fields: ["name"],
      },
    },
    fields: ["*"],
  });

  const playlists = await getPlaylists({
    filters: {
      $and: [{ isPublic: true }],
    },
    populate: {
      droplets: {
        populate: {
          lessons: {
            fields: ["id", "name", "slug"],
          },
        },
      },
    },
  });

  return (
    <SearchProvider>
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="text-5xl font-bold">Explore</h1>
      </div>

      <div className="mx-auto mt-4 mb-8 w-full max-w-7xl px-4 xl:p-0">
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800">
          <ContentTypeSelector
            droplets={droplets.length}
            playlists={playlists.length}
          />

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 flex-row flex-wrap items-center gap-2">
              {contentType === "droplets" &&
                DROPLET_FILTERS.map((filter) => (
                  <Filter
                    key={filter.name}
                    name={filter.name}
                    label={filter.label}
                    options={filter.options}
                  />
                ))}
              {contentType === "droplets" && <TagFilter />}
              {contentType === "droplets" && (
                <Sort options={sorting} defaultValue={defaultSort} />
              )}
              {contentType === "playlists" && (
                <Sort options={playlistSorting} defaultValue={defaultSort} />
              )}
            </div>
            <Search />
          </div>
        </div>
      </div>
      <div className="mx-auto mb-8 w-full max-w-7xl px-4 xl:p-0">
        {contentType === "droplets" ? (
          <Suspense fallback={<DropletsSkeleton />}>
            <DropletsGrid droplets={droplets} sortKey={sortKey} />
          </Suspense>
        ) : (
          <Suspense fallback={<DropletsSkeleton />}>
            <PlaylistsGrid playlists={playlists} sortKey={sortKey} />
          </Suspense>
        )}
      </div>
    </SearchProvider>
  );
}
