import {
  applySort,
  matchesSearch,
  dropletMatchesFilters,
  playlistMatchesFilters,
  voyageMatchesFilters,
} from "@/components/my-content/apply-sort-filter";
import { Droplet, Playlist, Voyage } from "@/types";

// Minimal fixture types for testing
type SortableItem = {
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

const makeDroplet = (overrides: Partial<Droplet>): Droplet =>
  ({
    id: 1,
    slug: "test",
    name: "Test Droplet",
    type: "knowledge",
    focusArea: "technical",
    difficulty: "beginner",
    isHidden: false,
    status: "published",
    learningObjectives: [],
    ...overrides,
  }) as Droplet;

const makePlaylist = (overrides: Partial<Playlist>): Playlist =>
  ({
    id: 1,
    name: "Test Playlist",
    slug: "test",
    isPublic: true,
    duration: "short",
    isArchived: false,
    ...overrides,
  }) as Playlist;

const makeVoyage = (overrides: Partial<Voyage>): Voyage =>
  ({
    id: 1,
    name: "Test Voyage",
    slug: "test",
    description: "",
    status: "published",
    isSequential: false,
    isArchived: false,
    ...overrides,
  }) as Voyage;

describe("applySort", () => {
  it("sorts items A-Z by name", () => {
    const items: SortableItem[] = [
      { name: "Zebra" },
      { name: "Apple" },
      { name: "Mango" },
    ];
    const result = applySort(items, "name:asc");
    expect(result.map((i) => i.name)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("sorts items Z-A by name", () => {
    const items: SortableItem[] = [
      { name: "Zebra" },
      { name: "Apple" },
      { name: "Mango" },
    ];
    const result = applySort(items, "name:desc");
    expect(result.map((i) => i.name)).toEqual(["Zebra", "Mango", "Apple"]);
  });

  it("sorts Newest first (createdAt:desc)", () => {
    const items: SortableItem[] = [
      { name: "Old", createdAt: "2023-01-01T00:00:00.000Z" },
      { name: "New", createdAt: "2024-06-01T00:00:00.000Z" },
      { name: "Mid", createdAt: "2023-12-01T00:00:00.000Z" },
    ];
    const result = applySort(items, "createdAt:desc");
    expect(result.map((i) => i.name)).toEqual(["New", "Mid", "Old"]);
  });

  it("sorts Oldest first (createdAt:asc)", () => {
    const items: SortableItem[] = [
      { name: "Old", createdAt: "2023-01-01T00:00:00.000Z" },
      { name: "New", createdAt: "2024-06-01T00:00:00.000Z" },
      { name: "Mid", createdAt: "2023-12-01T00:00:00.000Z" },
    ];
    const result = applySort(items, "createdAt:asc");
    expect(result.map((i) => i.name)).toEqual(["Old", "Mid", "New"]);
  });

  it("sorts by updatedAt:desc (Recently Updated)", () => {
    const items: SortableItem[] = [
      { name: "A", updatedAt: "2023-01-01T00:00:00.000Z" },
      { name: "B", updatedAt: "2024-06-01T00:00:00.000Z" },
    ];
    const result = applySort(items, "updatedAt:desc");
    expect(result.map((i) => i.name)).toEqual(["B", "A"]);
  });

  it("tolerates missing date fields (items without date go last)", () => {
    const items: SortableItem[] = [
      { name: "NoDates" },
      { name: "HasDate", createdAt: "2024-01-01T00:00:00.000Z" },
    ];
    const result = applySort(items, "createdAt:desc");
    expect(result[0].name).toBe("HasDate");
  });

  it("does not mutate the original array", () => {
    const items: SortableItem[] = [{ name: "B" }, { name: "A" }];
    const original = [...items];
    applySort(items, "name:asc");
    expect(items).toEqual(original);
  });

  it("returns original order for unknown sort key", () => {
    const items: SortableItem[] = [{ name: "B" }, { name: "A" }];
    const result = applySort(items, "unknown:asc");
    expect(result.map((i) => i.name)).toEqual(["B", "A"]);
  });
});

describe("matchesSearch", () => {
  it("returns true for exact match", () => {
    expect(matchesSearch({ name: "Hello World" }, "Hello World")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesSearch({ name: "Hello World" }, "hello")).toBe(true);
    expect(matchesSearch({ name: "hello world" }, "HELLO")).toBe(true);
  });

  it("returns true for substring match", () => {
    expect(matchesSearch({ name: "Introduction to Python" }, "Python")).toBe(
      true,
    );
  });

  it("returns false when no match", () => {
    expect(matchesSearch({ name: "Introduction to Python" }, "Java")).toBe(
      false,
    );
  });

  it("returns true when query is empty", () => {
    expect(matchesSearch({ name: "Anything" }, "")).toBe(true);
  });
});

describe("dropletMatchesFilters", () => {
  it("returns true when no filters active", () => {
    const droplet = makeDroplet({ status: "draft", isHidden: false });
    expect(dropletMatchesFilters(droplet, {})).toBe(true);
  });

  it("filters by status=draft", () => {
    const draft = makeDroplet({ status: "draft" });
    const published = makeDroplet({ status: "published" });
    expect(dropletMatchesFilters(draft, { status: ["draft"] })).toBe(true);
    expect(dropletMatchesFilters(published, { status: ["draft"] })).toBe(false);
  });

  it("filters by visibility=archived", () => {
    const archived = makeDroplet({ isHidden: true });
    const active = makeDroplet({ isHidden: false });
    expect(dropletMatchesFilters(archived, { visibility: ["archived"] })).toBe(
      true,
    );
    expect(dropletMatchesFilters(active, { visibility: ["archived"] })).toBe(
      false,
    );
  });

  it("filters by visibility=active", () => {
    const active = makeDroplet({ isHidden: false });
    const archived = makeDroplet({ isHidden: true });
    expect(dropletMatchesFilters(active, { visibility: ["active"] })).toBe(
      true,
    );
    expect(dropletMatchesFilters(archived, { visibility: ["active"] })).toBe(
      false,
    );
  });

  it("filters by focusArea", () => {
    const personal = makeDroplet({ focusArea: "personal" });
    const technical = makeDroplet({ focusArea: "technical" });
    expect(dropletMatchesFilters(personal, { focusArea: ["personal"] })).toBe(
      true,
    );
    expect(dropletMatchesFilters(technical, { focusArea: ["personal"] })).toBe(
      false,
    );
  });

  it("supports OR within a filter (multiple values)", () => {
    const personal = makeDroplet({ focusArea: "personal" });
    const technical = makeDroplet({ focusArea: "technical" });
    const professional = makeDroplet({ focusArea: "professional" });
    const filter = { focusArea: ["personal", "technical"] };
    expect(dropletMatchesFilters(personal, filter)).toBe(true);
    expect(dropletMatchesFilters(technical, filter)).toBe(true);
    expect(dropletMatchesFilters(professional, filter)).toBe(false);
  });

  it("applies AND across different filters", () => {
    const droplet = makeDroplet({ status: "draft", focusArea: "technical" });
    // Both conditions must be true
    expect(
      dropletMatchesFilters(droplet, {
        status: ["draft"],
        focusArea: ["technical"],
      }),
    ).toBe(true);
    // One condition fails
    expect(
      dropletMatchesFilters(droplet, {
        status: ["published"],
        focusArea: ["technical"],
      }),
    ).toBe(false);
  });
});

describe("playlistMatchesFilters", () => {
  it("returns true when no filters active", () => {
    const playlist = makePlaylist({});
    expect(playlistMatchesFilters(playlist, {})).toBe(true);
  });

  it("filters by visibility=archived", () => {
    const archived = makePlaylist({ isArchived: true });
    const active = makePlaylist({ isArchived: false });
    expect(playlistMatchesFilters(archived, { visibility: ["archived"] })).toBe(
      true,
    );
    expect(playlistMatchesFilters(active, { visibility: ["archived"] })).toBe(
      false,
    );
  });

  it("filters by public=public (isPublic true)", () => {
    const pub = makePlaylist({ isPublic: true });
    const priv = makePlaylist({ isPublic: false });
    expect(playlistMatchesFilters(pub, { public: ["public"] })).toBe(true);
    expect(playlistMatchesFilters(priv, { public: ["public"] })).toBe(false);
  });

  it("filters by public=private (isPublic false)", () => {
    const priv = makePlaylist({ isPublic: false });
    const pub = makePlaylist({ isPublic: true });
    expect(playlistMatchesFilters(priv, { public: ["private"] })).toBe(true);
    expect(playlistMatchesFilters(pub, { public: ["private"] })).toBe(false);
  });
});

describe("voyageMatchesFilters", () => {
  it("returns true when no filters active", () => {
    const voyage = makeVoyage({});
    expect(voyageMatchesFilters(voyage, {})).toBe(true);
  });

  it("filters by visibility=archived", () => {
    const archived = makeVoyage({ isArchived: true });
    const active = makeVoyage({ isArchived: false });
    expect(voyageMatchesFilters(archived, { visibility: ["archived"] })).toBe(
      true,
    );
    expect(voyageMatchesFilters(active, { visibility: ["archived"] })).toBe(
      false,
    );
  });

  it("filters by visibility=active", () => {
    const active = makeVoyage({ isArchived: false });
    const archived = makeVoyage({ isArchived: true });
    expect(voyageMatchesFilters(active, { visibility: ["active"] })).toBe(true);
    expect(voyageMatchesFilters(archived, { visibility: ["active"] })).toBe(
      false,
    );
  });
});
