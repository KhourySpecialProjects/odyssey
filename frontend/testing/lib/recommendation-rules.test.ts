import {
  rankRecommendations,
  voyageDropletIds,
} from "@/lib/recommendations/rules";
import type {
  LearningPath,
  RankInput,
  Rule,
  StudentState,
} from "@/lib/recommendations/rules";
import {
  candidateDroplet,
  studentState,
  voyageNode,
} from "../mocks/recommendations";

const input = (overrides: Partial<RankInput> = {}): RankInput => ({
  candidates: [],
  student: studentState(),
  excludeIds: [],
  ...overrides,
});
const ids = (r: ReturnType<typeof rankRecommendations>) =>
  r.map((p) => p.droplet.id);

describe("rule 5 and exclusions", () => {
  it("gives an empty profile `limit` popular picks in rating order", () => {
    const candidates = [1, 2, 3, 4, 5].map((id) =>
      candidateDroplet({ id, averageRating: id }),
    );
    const result = rankRecommendations(input({ candidates }), 3);

    expect(ids(result)).toEqual([5, 4, 3]);
    expect(result.every((p) => p.rule === "popular")).toBe(true);
  });

  it.each([
    ["enrolled", { student: studentState({ enrolledIds: new Set([1]) }) }],
    ["dismissed", { student: studentState({ dismissedIds: new Set([1]) }) }],
    ["excluded", { excludeIds: [1] }],
  ])("never returns a %s droplet", (_label, extra) => {
    const candidates = [
      candidateDroplet({ id: 1 }),
      candidateDroplet({ id: 2 }),
    ];
    expect(
      ids(rankRecommendations(input({ candidates, ...extra }), 5)),
    ).toEqual([2]);
  });

  it("never returns a droplet the student authored", () => {
    const candidates = [
      candidateDroplet({ id: 1, authorized_users: [{ id: 7 } as never] }),
      candidateDroplet({ id: 2 }),
    ];
    expect(ids(rankRecommendations(input({ candidates }), 5))).toEqual([2]);
  });

  it("breaks ties by name then id, and counts a null rating as 0", () => {
    const candidates = [
      candidateDroplet({ id: 3, name: "B", averageRating: 2 }),
      candidateDroplet({ id: 2, name: "A", averageRating: 2 }),
      candidateDroplet({ id: 1, name: "A", averageRating: 2 }),
      candidateDroplet({
        id: 4,
        name: "A",
        averageRating: null as unknown as number,
      }),
      candidateDroplet({ id: 5, name: "A", averageRating: 0 }),
    ];
    expect(ids(rankRecommendations(input({ candidates }), 5))).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("uses the right reason for rated and unrated picks", () => {
    const candidates = [
      candidateDroplet({ id: 1, averageRating: 4 }),
      candidateDroplet({ id: 2, averageRating: 0 }),
    ];
    expect(
      rankRecommendations(input({ candidates }), 2).map((p) => p.reason),
    ).toEqual(["Top rated on Odyssey", "Something new to try"]);
  });

  it("drops a candidate with no documentId", () => {
    const candidates = [
      candidateDroplet({ id: 1, documentId: undefined as never }),
      candidateDroplet({ id: 2 }),
    ];
    expect(ids(rankRecommendations(input({ candidates }), 5))).toEqual([2]);
  });

  it("returns every eligible droplet when limit is larger", () => {
    const candidates = [
      candidateDroplet({ id: 1 }),
      candidateDroplet({ id: 2 }),
    ];
    expect(rankRecommendations(input({ candidates }), 24)).toHaveLength(2);
  });
});

it("skips a pick whose id is not eligible", () => {
  const stub: Rule = () => [
    { id: 99, rule: "popular", reason: "x" },
    { id: 1, rule: "popular", reason: "y" },
  ];
  const candidates = [candidateDroplet({ id: 1 })];
  const result = rankRecommendations(input({ candidates }), 5, [stub]);
  expect(result.map((p) => [p.droplet.id, p.reason])).toEqual([[1, "y"]]);
});

describe("rules 1, 2 and 4", () => {
  const live = (...list: number[]) =>
    list.map((id) => candidateDroplet({ id }));
  const fin = (id: number, at = 1) => ({ id, name: `Done ${id}`, at });
  const voyage = (name: string, dropletIds: number[]): LearningPath => ({
    rule: "next-in-voyage",
    name,
    dropletIds,
  });
  const playlist = (name: string, dropletIds: number[]): LearningPath => ({
    rule: "next-in-playlist",
    name,
    dropletIds,
  });
  const rank = (
    candidates: RankInput["candidates"],
    student: Partial<StudentState>,
    limit = 24,
  ) =>
    rankRecommendations(
      input({ candidates, student: studentState(student) }),
      limit,
    );
  const pathPicks = (r: ReturnType<typeof rankRecommendations>) =>
    r.filter((p) => p.rule.startsWith("next-in")).map((p) => p.droplet.id);

  it("flattens a voyage: main order, required branches, playlists", () => {
    const d = (id: number) => ({ id });
    const nodes = [
      voyageNode({ id: 1, orderIndex: 2, droplet: d(20) }),
      voyageNode({ id: 2, orderIndex: 1, droplet: d(10) }),
      voyageNode({
        id: 3,
        orderIndex: 5,
        isMainPath: false,
        parentNode: { id: 2 },
        droplet: d(11),
      }),
      voyageNode({
        id: 4,
        orderIndex: 6,
        isMainPath: false,
        branchType: "optional",
        parentNode: { id: 2 },
        droplet: d(99),
      }),
      voyageNode({
        id: 5,
        orderIndex: 3,
        nodeType: "playlist",
        playlist: { droplets: [d(31), d(30), d(10)] },
      }),
      voyageNode({ id: 6, orderIndex: 4 }),
    ];
    expect(voyageDropletIds(nodes)).toEqual([10, 11, 20, 31, 30]);
  });

  describe("rule 1", () => {
    it("picks the next droplet after a finished one", () => {
      const result = rank(live(1, 2, 3), {
        finished: [fin(1)],
        enrolledIds: new Set([1]),
        paths: [voyage("Web Foundations", [1, 2, 3])],
      });
      expect(result[0]).toMatchObject({
        droplet: { id: 2 },
        rule: "next-in-voyage",
        reason: "Next in your voyage: Web Foundations",
      });
      expect(pathPicks(result)).toEqual([2]);
    });

    it.each([
      ["next is in progress", [1, 2], [1, 2], [], [1, 2, 3], undefined],
      ["next is dismissed", [1, 2, 3], [1], [2], [1, 2, 3], 3],
      ["next is not a candidate", [1, 99, 3], [1], [], [1, 2, 3], 3],
      ["everything is finished", [1], [1], [], [1, 2, 3], undefined],
      ["enrolled droplet is not live", [1, 2, 3], [1, 2], [], [1, 3], 3],
    ] as const)(
      "walk: %s",
      (_label, path, enrolled, dismissed, candidateIds, expected) => {
        const result = rank(live(...candidateIds), {
          finished: [fin(1)],
          enrolledIds: new Set(enrolled),
          dismissedIds: new Set(dismissed),
          paths: [voyage("V", [...path])],
        });
        expect(pathPicks(result)).toEqual(expected ? [expected] : []);
      },
    );

    it("uses the voyage reason when a droplet is in a voyage and a playlist", () => {
      const result = rank(live(1), {
        paths: [voyage("V", [1]), playlist("P", [1])],
      });
      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe("next-in-voyage");
    });

    it("doesn't spend a path slot on a droplet with no documentId", () => {
      const candidates = [
        candidateDroplet({ id: 1, documentId: undefined as never }),
        ...live(2, 3),
      ];
      const result = rank(candidates, {
        paths: [voyage("A", [1]), voyage("B", [2]), voyage("C", [3])],
      });
      expect(pathPicks(result)).toEqual([2, 3]);
    });

    it("words a playlist pick with the playlist name", () => {
      const result = rank(live(1), { paths: [playlist("Intro", [1])] });
      expect(result[0]).toMatchObject({
        rule: "next-in-playlist",
        reason: "Next in your playlist: Intro",
      });
    });

    it("caps path picks at 2 and lets the rest fall through", () => {
      const candidates = [
        candidateDroplet({ id: 1, averageRating: 5 }),
        candidateDroplet({ id: 2 }),
        candidateDroplet({ id: 3, tags: [{ id: 9, name: "React" } as never] }),
        candidateDroplet({ id: 4 }),
      ];
      const result = rank(candidates, {
        interests: [{ id: 9, name: "React" }],
        paths: [
          voyage("A", [1]),
          voyage("B", [2]),
          voyage("C", [3]),
          playlist("D", [4]),
        ],
      });
      expect(result.map((p) => [p.droplet.id, p.rule])).toEqual([
        [1, "next-in-voyage"],
        [2, "next-in-voyage"],
        [3, "interest"],
        [4, "popular"],
      ]);
    });

    it("uses one slot when two paths share the next droplet", () => {
      const result = rank(live(1, 2, 3), {
        paths: [voyage("A", [1]), voyage("B", [1]), voyage("C", [2])],
      });
      expect(pathPicks(result)).toEqual([1, 2]);
    });
  });

  describe("rule 2", () => {
    it("names the newest finished prerequisite", () => {
      const candidates = [
        candidateDroplet({ id: 5, prerequisites: [{ id: 1 }, { id: 2 }] }),
        candidateDroplet({ id: 6, averageRating: 5 }),
      ];
      const result = rank(candidates, {
        finished: [fin(2, 20), fin(1, 10)],
        enrolledIds: new Set([1, 2]),
      });
      expect(result[0]).toMatchObject({
        droplet: { id: 5 },
        rule: "postrequisite",
        reason: "Builds on Done 2",
      });
    });

    it("orders postrequisites by how recently their source finished", () => {
      const candidates = [
        candidateDroplet({ id: 5, prerequisites: [{ id: 1 }] }),
        candidateDroplet({ id: 6, prerequisites: [{ id: 2 }] }),
      ];
      const result = rank(candidates, {
        finished: [fin(2, 20), fin(1, 10)],
        enrolledIds: new Set([1, 2]),
      });
      expect(ids(result)).toEqual([6, 5]);
    });

    it("never surfaces a dismissed or excluded postrequisite", () => {
      const candidates = [
        candidateDroplet({ id: 5, prerequisites: [{ id: 1 }] }),
        candidateDroplet({ id: 6, prerequisites: [{ id: 1 }] }),
        candidateDroplet({ id: 7 }),
      ];
      const result = rankRecommendations(
        input({
          candidates,
          excludeIds: [6],
          student: studentState({
            finished: [fin(1)],
            enrolledIds: new Set([1]),
            dismissedIds: new Set([5]),
          }),
        }),
        24,
      );
      expect(ids(result)).toEqual([7]);
    });

    it("never surfaces a non-candidate postrequisite", () => {
      const result = rank(live(6), {
        finished: [fin(1)],
        enrolledIds: new Set([1]),
      });
      expect(ids(result)).toEqual([6]);
    });
  });

  describe("rule 4", () => {
    const tag = (id: number) => ({ id, name: `Tag ${id}` }) as never;

    it("ranks 2 tags over 1 tag over focus only, naming the first interest", () => {
      const candidates = [
        candidateDroplet({ id: 1, focusArea: "personal" }),
        candidateDroplet({ id: 2, tags: [tag(2)] }),
        candidateDroplet({ id: 3, tags: [tag(1), tag(2)] }),
      ];
      const result = rank(candidates, {
        interests: [
          { id: 1, name: "Tag 1" },
          { id: 2, name: "Tag 2" },
        ],
        focusAreas: ["personal"],
      });
      expect(result.map((p) => [p.droplet.id, p.reason])).toEqual([
        [3, "Matches your interest: Tag 1"],
        [2, "Matches your interest: Tag 2"],
        [1, "Matches your focus: Personal"],
      ]);
      expect(result.every((p) => p.rule === "interest")).toBe(true);
    });

    it("ignores focus when all 3 areas are chosen", () => {
      const result = rank(live(1), {
        focusAreas: ["personal", "professional", "technical"],
      });
      expect(result[0].rule).toBe("popular");
    });
  });

  it("orders by rule and shows each droplet once", () => {
    const t = [{ id: 9, name: "T" } as never];
    const candidates = [
      candidateDroplet({ id: 1, averageRating: 5 }),
      candidateDroplet({ id: 2, tags: t, prerequisites: [{ id: 50 }] }),
      candidateDroplet({ id: 3, tags: t }),
      candidateDroplet({ id: 4 }),
    ];
    const result = rank(candidates, {
      finished: [fin(50)],
      enrolledIds: new Set([50]),
      interests: [{ id: 9, name: "T" }],
      paths: [voyage("V", [4])],
    });
    expect(result.map((p) => [p.droplet.id, p.rule])).toEqual([
      [4, "next-in-voyage"],
      [2, "postrequisite"],
      [3, "interest"],
      [1, "popular"],
    ]);
  });
});
