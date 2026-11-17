/** @jest-environment node */
import { getDropletById } from "@/lib/requests/droplet";
import { CHECKS } from "@/lib/overview-scan/checks";
import { createSafeFetcher } from "@/lib/overview-scan/network";
import { runChecks } from "@/lib/overview-scan/run";
import { SCAN_DROPLET_QUERY, scanDroplet } from "@/lib/overview-scan/scan";
import {
  buildScanDocument,
  type ScanSourceDroplet,
  type ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";

jest.mock("@/lib/requests/droplet", () => ({ getDropletById: jest.fn() }));
jest.mock("@/lib/overview-scan/network", () => ({
  createSafeFetcher: jest.fn(),
}));
jest.mock("@/lib/overview-scan/run", () => ({ runChecks: jest.fn() }));

jest.mock("@/lib/overview-scan/snapshot", () => {
  const actual = jest.requireActual("@/lib/overview-scan/snapshot");
  return { ...actual, buildScanDocument: jest.fn(actual.buildScanDocument) };
});

const buildSpy = buildScanDocument as jest.Mock;
const getDroplet = getDropletById as jest.Mock;
const fetcher = jest.fn();

describe("scanDroplet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createSafeFetcher as jest.Mock).mockReturnValue(fetcher);
  });

  it("reads fresh, orders lessons, builds the fetcher last and drops extra run members", async () => {
    getDroplet.mockResolvedValue({
      id: 7,
      name: "D",
      lessons: [
        { id: 2, name: "B", orderIndex: 2 },
        { id: 1, name: "A", orderIndex: 1 },
      ],
    });
    (runChecks as jest.Mock).mockResolvedValue({
      rulesVersion: "v",
      passed: 1,
      needsAttention: 2,
      couldNotCheck: 3,
      results: [],
      extra: "dropped",
    });

    const result = await scanDroplet(7);

    expect(getDroplet).toHaveBeenCalledWith(7, SCAN_DROPLET_QUERY, {
      fresh: true,
    });
    expect(buildSpy.mock.calls[0][1].map((l: { id: number }) => l.id)).toEqual([
      1, 2,
    ]);
    const fetcherOrder = (createSafeFetcher as jest.Mock).mock
      .invocationCallOrder[0];
    expect(fetcherOrder).toBeGreaterThan(buildSpy.mock.invocationCallOrder[0]);
    expect(fetcherOrder).toBeLessThan(
      (runChecks as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(createSafeFetcher).toHaveBeenCalledTimes(1);
    expect(runChecks).toHaveBeenCalledWith(expect.anything(), CHECKS, fetcher);
    expect(result).toEqual({
      rulesVersion: "v",
      passed: 1,
      needsAttention: 2,
      couldNotCheck: 3,
      results: [],
    });
  });

  it("builds a document from a droplet shaped like SCAN_DROPLET_QUERY", () => {
    const queried: Required<ScanSourceDroplet> = {
      id: 7,
      name: "D",
      overview: "<p>o</p>",
      description: "d",
      difficulty: "beginner",
      funFact: "f",
      originalDropletId: 5,
      tags: [{ name: "t" }],
      learningObjectives: [{ objective: "o" }],
      nextSteps: [{ label: "l", url: "https://example.com" }],
      prerequisites: [
        { id: 1, name: "p", status: "published", isHidden: false },
      ],
      postrequisites: [
        { id: 2, name: "q", status: "published", isHidden: false },
      ],
      datasets: [
        { name: "n", fileUrl: "https://example.com/a.csv", rowCount: 1 },
      ],
    };
    const queriedLesson: Required<ScanSourceLesson> = {
      id: 1,
      name: "A",
      blocksVersion: "v2",
      blocksV2: [],
      blocks: [],
    };
    const doc = buildScanDocument(queried, [queriedLesson]);
    expect(doc.droplet.name).toBe("D");

    // Every member the snapshot reads must be in the query, and the reverse.
    const populate = SCAN_DROPLET_QUERY.populate as Record<
      string,
      { fields?: string[]; populate?: object }
    >;
    const dropletKeys = [
      ...(SCAN_DROPLET_QUERY.fields ?? []),
      ...Object.keys(populate).filter((k) => k !== "lessons"),
    ];
    expect(
      Object.keys(queried)
        .filter((k) => k !== "id")
        .sort(),
    ).toEqual(dropletKeys.sort());
    const lessonKeys = [
      ...(populate.lessons.fields ?? []).filter((k) => k !== "orderIndex"),
      ...Object.keys(populate.lessons.populate ?? {}),
    ];
    expect(
      Object.keys(queriedLesson)
        .filter((k) => k !== "id")
        .sort(),
    ).toEqual(lessonKeys.sort());
  });
});
