import { sortPlaylists } from "@/lib/playlist-sort";

describe("sortPlaylists", () => {
  const playlists = [
    { id: 1, name: "Beta", completionPercentage: 50 },
    { id: 2, name: "Alpha", completionPercentage: 100 },
    { id: 3, name: "Gamma", completionPercentage: 0 },
  ];

  it("sorts by name ascending and descending", () => {
    expect(sortPlaylists(playlists, "name:asc").map((p) => p.id)).toEqual([
      2, 1, 3,
    ]);
    expect(sortPlaylists(playlists, "name:desc").map((p) => p.id)).toEqual([
      3, 1, 2,
    ]);
  });

  it("sorts by completion ascending and descending", () => {
    expect(sortPlaylists(playlists, "completion:asc").map((p) => p.id)).toEqual(
      [3, 1, 2],
    );
    expect(
      sortPlaylists(playlists, "completion:desc").map((p) => p.id),
    ).toEqual([2, 1, 3]);
  });

  it("treats a missing completionPercentage as 0", () => {
    const mixed = [{ name: "A", completionPercentage: 10 }, { name: "B" }];
    expect(sortPlaylists(mixed, "completion:asc").map((p) => p.name)).toEqual([
      "B",
      "A",
    ]);
  });

  it("keeps the original order without a key or for unsupported fields", () => {
    expect(sortPlaylists(playlists)).toBe(playlists);
    expect(sortPlaylists(playlists, "rating:desc")).toBe(playlists);
  });

  it("does not mutate the input", () => {
    const input = [...playlists];
    sortPlaylists(input, "name:asc");
    expect(input.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
