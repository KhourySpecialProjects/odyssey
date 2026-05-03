"use client";

import { useQueryState } from "nuqs";
import { SearchBar } from "@/components/admin/search-bar";
import { Filter } from "@/components/explore/filter";
import { Sort } from "@/components/explore/sort";
import {
  dropletCreatorSorting,
  playlistCreatorSorting,
  voyageCreatorSorting,
  DROPLET_CREATOR_FILTERS,
  PLAYLIST_CREATOR_FILTERS,
  VOYAGE_CREATOR_FILTERS,
  CREATOR_DEFAULT_SORT,
} from "@/components/my-content/sort-filter-options";

interface MyContentToolbarProps {
  tab: "droplets" | "playlists" | "voyages";
}

export function MyContentToolbar({ tab }: MyContentToolbarProps) {
  const [q, setQ] = useQueryState("q", { defaultValue: "", throttleMs: 300 });

  const sortOptions =
    tab === "droplets"
      ? dropletCreatorSorting
      : tab === "playlists"
        ? playlistCreatorSorting
        : voyageCreatorSorting;

  const filterDefs =
    tab === "droplets"
      ? DROPLET_CREATOR_FILTERS
      : tab === "playlists"
        ? PLAYLIST_CREATOR_FILTERS
        : VOYAGE_CREATOR_FILTERS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBar
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search..."
        className="w-full md:w-64"
        inputClassName="h-9"
      />

      {filterDefs.map((f) => (
        <Filter
          key={f.name}
          name={f.name}
          label={f.label}
          options={f.options}
        />
      ))}

      <Sort options={sortOptions} defaultValue={CREATOR_DEFAULT_SORT} />
    </div>
  );
}
