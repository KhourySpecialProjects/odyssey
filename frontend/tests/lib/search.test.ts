import { searchItems } from "@/lib/search";

type Item = { name: string; description?: string; tags?: string[] };

const catalogue: Item[] = [
  { name: "Python Basics", description: "Start programming" },
  { name: "Data Science", description: "Explore data with pandas" },
  { name: "Machine Learning", tags: ["AI"] },
  { name: "Résumé Writing" },
  { name: "Code Review" },
  { name: "Node Basics" },
  { name: "Java Fundamentals" },
  { name: "Internet Basics" },
  { name: "Mock Interviews" },
  { name: "How Computers Work" },
];

const search = (query: string) => {
  const { items, approximate } = searchItems(catalogue, query, (item) => [
    item.name,
    item.description,
    ...(item.tags ?? []),
  ]);
  return { names: items.map((i) => i.name), approximate };
};

describe("searchItems", () => {
  it("returns everything for an empty query", () => {
    expect(search("  ")).toEqual({
      names: catalogue.map((i) => i.name),
      approximate: false,
    });
  });

  it("matches exactly first: every word in some field, any case", () => {
    expect(search("data PANDAS")).toEqual({
      names: ["Data Science"],
      approximate: false,
    });
    expect(search("basics")).toEqual({
      names: ["Python Basics", "Node Basics", "Internet Basics"],
      approximate: false,
    });
  });

  it("finds words despite a typo", () => {
    expect(search("pyhton")).toEqual({
      names: ["Python Basics"],
      approximate: true,
    });
    expect(search("scince")).toEqual({
      names: ["Data Science"],
      approximate: true,
    });
    expect(search("fundamentls")).toEqual({
      names: ["Java Fundamentals"],
      approximate: true,
    });
  });

  it("allows two typos in long words and handles several misspelled words", () => {
    expect(search("machne lerning").names).toEqual(["Machine Learning"]);
    expect(search("fundamnetls").names).toEqual(["Java Fundamentals"]);
  });

  it("matches a half-typed word with a typo", () => {
    expect(search("pyhto").names).toEqual(["Python Basics"]);
  });

  it("matches a shortened word with a letter missing", () => {
    expect(search("compter").names).toEqual(["How Computers Work"]);
  });

  it("keeps two typos for long words only", () => {
    // "internet" is two edits from "intervew" (8 letters): not a match
    expect(search("intervew").names).toEqual(["Mock Interviews"]);
  });

  it("ignores accents", () => {
    expect(search("resume")).toEqual({
      names: ["Résumé Writing"],
      approximate: false,
    });
  });

  it("only falls back to close matches when nothing matches exactly", () => {
    // "node" is one letter off "code", but "code" matches exactly
    expect(search("code")).toEqual({
      names: ["Code Review"],
      approximate: false,
    });
  });

  it("doesn't guess for very short words or far-off words", () => {
    expect(search("jva").names).toEqual([]);
    expect(search("zzzzzz").names).toEqual([]);
    expect(search("zzzzzz").approximate).toBe(false);
  });
});
