import { CHECKS } from "@/lib/overview-scan/checks";
import { RULES_VERSION } from "@/lib/overview-scan/config";
import type { FetchUrl } from "@/lib/overview-scan/network";
import { runChecks } from "@/lib/overview-scan/run";
import { flag, type Check, type Rule } from "@/lib/overview-scan/types";
import {
  sampleScanDocument,
  sampleWeb,
  scanDoc,
} from "@/testing/mocks/overview-scan";

const doc = scanDoc();
const part = doc.parts[1];
const warn = flag(part, "b1", "Needs work.");
const unknown = flag(part, "b2", "Couldn't load.", "unknown");

const noFetch: FetchUrl = () => {
  throw new Error("a test rule fetched a URL");
};

/** A check whose rules are r1, r2, … */
const check = (id: string, ...runs: Rule["run"][]): Check => ({
  id,
  group: "content",
  title: id,
  description: "",
  scope: "",
  rules: runs.map((run, i) => ({ id: `r${i + 1}`, text: "", run })),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("runChecks", () => {
  it("gives each rule and check a status, and counts the checks", async () => {
    const result = await runChecks(
      doc,
      [
        check("clean", () => []),
        check(
          "mixed",
          () => [],
          () => [unknown],
          async () => [unknown, warn],
        ),
        check("unsure", () => [unknown]),
      ],
      noFetch,
    );

    expect(result).toEqual({
      rulesVersion: RULES_VERSION,
      passed: 1,
      needsAttention: 1,
      couldNotCheck: 1,
      results: [
        {
          id: "clean",
          status: "pass",
          rules: [{ id: "r1", status: "pass", flags: [] }],
        },
        {
          id: "mixed",
          status: "warn",
          rules: [
            { id: "r1", status: "pass", flags: [] },
            { id: "r2", status: "unknown", flags: [unknown] },
            { id: "r3", status: "warn", flags: [unknown, warn] },
          ],
        },
        {
          id: "unsure",
          status: "unknown",
          rules: [{ id: "r1", status: "unknown", flags: [unknown] }],
        },
      ],
    });
  });

  it.each([
    [
      "throws",
      () => {
        throw new Error("boom");
      },
    ],
    ["rejects", () => Promise.reject(new Error("boom"))],
  ])(
    "reports a rule that %s as couldn't check and keeps scanning",
    async (_, broken: Rule["run"]) => {
      const result = await runChecks(
        doc,
        [check("broken", () => [], broken), check("next", () => [warn])],
        noFetch,
      );

      expect(result.results[0]).toEqual({
        id: "broken",
        status: "unknown",
        rules: [
          { id: "r1", status: "pass", flags: [] },
          {
            id: "r2",
            status: "unknown",
            flags: [
              expect.objectContaining({
                severity: "unknown",
                message: "This rule hit an error, so it couldn't be checked.",
              }),
            ],
          },
        ],
      });
      expect(result).toMatchObject({ needsAttention: 1, couldNotCheck: 1 });
      expect(console.error).toHaveBeenCalledWith(
        "Overview scan rule broken/r2 failed",
        expect.any(Error),
      );
    },
  );

  it("runs every registered check on the sample droplet without a rule failing", async () => {
    const fetchUrl: FetchUrl = async (url) =>
      sampleWeb[url] ?? { kind: "broken", finalUrl: url, status: 404 };

    const result = await runChecks(sampleScanDocument, CHECKS, fetchUrl);

    expect(new Set(CHECKS.map((c) => c.id)).size).toBe(CHECKS.length);
    expect(result.results.map((r) => r.id)).toEqual(CHECKS.map((c) => c.id));
    expect(console.error).not.toHaveBeenCalled();
    expect(result.passed + result.needsAttention + result.couldNotCheck).toBe(
      CHECKS.length,
    );
  });
});
