import { FilterOption, SortFilterItem } from "@/lib/globals";

// Sort options shared across all creator tabs
const BASE_CREATOR_SORTING: SortFilterItem[] = [
  { label: "A–Z", slug: "name:asc", sortKey: "name:asc" },
  { label: "Z–A", slug: "name:desc", sortKey: "name:desc" },
  { label: "Newest", slug: "createdAt:desc", sortKey: "createdAt:desc" },
  { label: "Oldest", slug: "createdAt:asc", sortKey: "createdAt:asc" },
  {
    label: "Recently Updated",
    slug: "updatedAt:desc",
    sortKey: "updatedAt:desc",
  },
];

export const dropletCreatorSorting: SortFilterItem[] = BASE_CREATOR_SORTING;
export const playlistCreatorSorting: SortFilterItem[] = BASE_CREATOR_SORTING;
export const voyageCreatorSorting: SortFilterItem[] = BASE_CREATOR_SORTING;

// Default sort for creator pages: Recently Updated
export const CREATOR_DEFAULT_SORT: SortFilterItem = BASE_CREATOR_SORTING[4];

// Shared visibility options (applies to droplets, playlists, voyages)
const VISIBILITY_OPTIONS: FilterOption[] = [
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export const DROPLET_CREATOR_FILTERS: {
  name: string;
  label: string;
  options: FilterOption[];
}[] = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
    ],
  },
  {
    name: "visibility",
    label: "Visibility",
    options: VISIBILITY_OPTIONS,
  },
  {
    name: "focusArea",
    label: "Focus Area",
    options: [
      { label: "Personal", value: "personal" },
      { label: "Professional", value: "professional" },
      { label: "Technical", value: "technical" },
    ],
  },
  {
    name: "type",
    label: "Type",
    options: [
      { label: "Knowledge", value: "knowledge" },
      { label: "Skill", value: "skill" },
    ],
  },
  {
    name: "difficulty",
    label: "Difficulty",
    options: [
      { label: "Beginner", value: "beginner" },
      { label: "Intermediate", value: "intermediate" },
      { label: "Advanced", value: "advanced" },
    ],
  },
];

export const PLAYLIST_CREATOR_FILTERS: {
  name: string;
  label: string;
  options: FilterOption[];
}[] = [
  {
    name: "visibility",
    label: "Visibility",
    options: VISIBILITY_OPTIONS,
  },
  {
    name: "public",
    label: "Availability",
    options: [
      { label: "Public", value: "public" },
      { label: "Private", value: "private" },
    ],
  },
];

export const VOYAGE_CREATOR_FILTERS: {
  name: string;
  label: string;
  options: FilterOption[];
}[] = [
  {
    name: "visibility",
    label: "Visibility",
    options: VISIBILITY_OPTIONS,
  },
];
