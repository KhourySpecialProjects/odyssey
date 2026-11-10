import { RULES_VERSION } from "@/lib/overview-scan/config";
import {
  DROPLET_SECTIONS,
  applyDismissals,
  buildScanView,
  flagKeyId,
  scanFlagDomId,
} from "@/lib/overview-scan/view";
import type {
  Check,
  CheckResult,
  Flag,
  OverviewScan,
  RuleResult,
  ScanDismissal,
  ScanFlagKey,
} from "@/lib/overview-scan/types";

const rule = (id: string) => ({ id, text: `Rule ${id}`, run: () => [] });
const check = (id: string, group: Check["group"], ruleIds = ["a"]): Check => ({
  id,
  group,
  title: `Check ${id}`,
  description: "d",
  scope: "s",
  rules: ruleIds.map(rule),
});
const flag = (
  partId: string,
  blockId: string | null = null,
  words?: string[],
): Flag => ({
  partId,
  blockId,
  message: "msg",
  severity: "warn",
  ...(words && { words }),
});
const ruleResult = (
  id: string,
  status: RuleResult["status"],
  flags: Flag[] = [],
): RuleResult => ({ id, status, flags });
const result = (
  id: string,
  status: CheckResult["status"],
  rules: RuleResult[] = [ruleResult("a", status)],
): CheckResult => ({ id, status, rules });
const scanOf = (
  results: CheckResult[],
  overrides: Partial<OverviewScan> = {},
): OverviewScan => ({
  id: 1,
  ranAt: "2026-11-03T15:04:00.000Z",
  rulesVersion: RULES_VERSION,
  passed: 0,
  needsAttention: 0,
  couldNotCheck: 0,
  results,
  ranBy: { id: 2, firstName: "Ada", lastName: "Lovelace" },
  ...overrides,
});

const CHECKS = [
  check("c1", "content"),
  check("s1", "structure"),
  check("s2", "structure"),
  check("m1", "media"),
];
const LESSONS = [
  { id: 11, name: "First", slug: "first" },
  { id: 12, name: "Second", slug: "second" },
];
const build = (
  scan: OverviewScan | null,
  checks: readonly Check[] = CHECKS,
  contentHash?: string,
) =>
  buildScanView({ checks, scan, lessons: LESSONS, contentHash, slug: "drop" });
const allChecks = (v: ReturnType<typeof build>) =>
  v.columns.flatMap((c) => c.checks);

describe("buildScanView", () => {
  it("shows every check as not run when there is no scan", () => {
    const v = build(null);
    expect(allChecks(v).map((c) => c.status)).toEqual(Array(4).fill("not-run"));
    expect(v.counts).toEqual({
      passed: 0,
      needsAttention: 0,
      couldNotCheck: 0,
    });
    expect(v).toMatchObject({
      checksChanged: false,
      ranAt: null,
      ranBy: null,
      checkCount: 4,
    });
  });

  it("counts statuses from the rows and names who ran it", () => {
    const v = build(
      scanOf([
        result("c1", "pass"),
        result("s1", "warn"),
        result("s2", "unknown"),
        result("m1", "pass"),
      ]),
    );
    expect(v.counts).toEqual({
      passed: 2,
      needsAttention: 1,
      couldNotCheck: 1,
    });
    expect(v.ranBy).toBe("Ada Lovelace");
    expect(v.checksChanged).toBe(false);
  });

  it.each([
    ["no relation", null, null],
    ["empty names", { id: 2, firstName: null, lastName: "" }, null],
    ["first name only", { id: 2, firstName: "Ada" }, "Ada"],
  ])("ranBy with %s", (_n, ranBy, expected) => {
    expect(build(scanOf([], { ranBy })).ranBy).toBe(expected);
  });

  it("lists the columns in order, keeping an empty one", () => {
    const v = build(null, [check("s1", "structure"), check("m1", "media")]);
    expect(v.columns.map((c) => [c.group, c.checks.length])).toEqual([
      ["content", 0],
      ["structure", 1],
      ["media", 1],
    ]);
    expect(v.columns.map((c) => c.title)).toEqual([
      "Content",
      "Structure",
      "Media and accessibility",
    ]);
  });

  it("marks a check with no saved result not run and flags a change", () => {
    const v = build(
      scanOf([
        result("c1", "pass"),
        result("s1", "pass"),
        result("s2", "pass"),
      ]),
    );
    expect(allChecks(v).map((c) => c.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "not-run",
    ]);
    expect(v.counts.passed).toBe(3);
    expect(v.checksChanged).toBe(true);
  });

  it("flags a change when a saved check lacks a current rule", () => {
    const two = [check("c1", "content", ["a", "b"])];
    const v = build(scanOf([result("c1", "pass")]), two);
    expect(v.checksChanged).toBe(true);
    expect(v.columns[0].checks[0].rules.map((r) => r.status)).toEqual([
      "pass",
      "not-run",
    ]);
  });

  it("flags a rulesVersion mismatch", () => {
    const all = CHECKS.map((c) => result(c.id, "pass"));
    expect(build(scanOf(all, { rulesVersion: "old" })).checksChanged).toBe(
      true,
    );
  });

  it("drops saved checks and rules the checks no longer have", () => {
    const v = build(
      scanOf([
        ...CHECKS.map((c) =>
          c.id === "c1"
            ? result("c1", "warn", [
                ruleResult("a", "warn"),
                ruleResult("gone", "warn", [flag("11")]),
              ])
            : result(c.id, "pass"),
        ),
        result("removed", "warn"),
      ]),
    );
    expect(allChecks(v).map((c) => c.id)).toEqual(["c1", "s1", "s2", "m1"]);
    expect(allChecks(v)[0].rules.map((r) => r.id)).toEqual(["a"]);
    expect(v.counts).toEqual({
      passed: 3,
      needsAttention: 1,
      couldNotCheck: 0,
    });
  });

  it("sorts rules warn, unknown, pass, not run, keeping order within a status", () => {
    const c = check("c1", "content", ["p1", "w1", "n1", "u1", "w2"]);
    const v = build(
      scanOf([
        result("c1", "warn", [
          ruleResult("p1", "pass"),
          ruleResult("w1", "warn"),
          ruleResult("u1", "unknown"),
          ruleResult("w2", "warn"),
        ]),
      ]),
      [c],
    );
    expect(v.columns[0].checks[0].rules.map((r) => r.id)).toEqual([
      "w1",
      "w2",
      "u1",
      "p1",
      "n1",
    ]);
  });

  it.each([
    // A lesson link names its block and any words to highlight (ODY-913)
    [
      "a lesson",
      flag("12", "b1"),
      "Lesson 2 · Second",
      "/draft/d/drop/second?block=b1",
    ],
    [
      "a lesson's spelling",
      flag("12", "b1", ["recieve", "don’t"]),
      "Lesson 2 · Second",
      "/draft/d/drop/second?block=b1&words=recieve%2Cdon%E2%80%99t",
    ],
    [
      "a lesson name's spelling",
      flag("12", null, ["Teh"]),
      "Lesson 2 · Second",
      "/draft/d/drop/second?block=title&words=Teh",
    ],
    [
      "a whole-lesson flag",
      flag("12"),
      "Lesson 2 · Second",
      "/draft/d/drop/second",
    ],
    [
      "a mapped section",
      flag("droplet", "tags"),
      "Droplet page · Tags and difficulty",
      "/draft/d/drop#scan-tags",
    ],
    [
      "an unmapped section",
      flag("droplet", "zzz"),
      "Droplet page",
      "/draft/d/drop",
    ],
    ["no block", flag("droplet"), "Droplet page", "/draft/d/drop"],
    ["a deleted lesson", flag("99"), "Deleted lesson", null],
  ])("builds the card for %s", (_n, f, label, href) => {
    const v = build(
      scanOf([
        result("c1", "warn", [ruleResult("a", "warn", [f])]),
        ...CHECKS.slice(1).map((c) => result(c.id, "pass")),
      ]),
    );
    const card = v.columns[0].checks[0].rules[0].flags[0];
    expect(card).toMatchObject({ label, href, message: "msg" });
    expect(card.linkText).toBe(
      href === null
        ? null
        : f.partId === "droplet"
          ? "Go to droplet page"
          : "Go to lesson",
    );
    expect(v.columns[0].checks[0].flagCount).toBe(1);
  });

  // ODY-878: compares the saved content hash with the current one
  it.each([
    ["the hashes match", "aaa", "aaa", false],
    ["the hashes differ", "aaa", "bbb", true],
    // Scans saved before the hash existed show nothing rather than guess
    ["the scan has no hash", undefined, "bbb", false],
  ])("editedSince when %s", (_n, saved, contentHash, expected) => {
    const scan = scanOf([], { contentHash: saved });
    expect(build(scan, CHECKS, contentHash).editedSince).toBe(expected);
  });

  it("says edited since when a flagged lesson no longer exists", () => {
    const v = build(
      scanOf([result("c1", "warn", [ruleResult("a", "warn", [flag("99")])])]),
    );
    expect(v.editedSince).toBe(true);
  });

  // The droplet blockIds in rules/{structure,media,content}.ts.
  it.each([
    "overview",
    "objectives",
    "prerequisites",
    "next-steps",
    "description",
    "tags",
    "datasets",
    "fun-fact",
  ])("has a section for the %s flag target", (id) => {
    expect(DROPLET_SECTIONS).toHaveProperty([id]);
  });

  it("never says edited since when there is no scan", () => {
    const v = buildScanView({
      checks: CHECKS,
      scan: null,
      lessons: [],
      contentHash: "bbb",
      slug: "drop",
    });
    expect(v.editedSince).toBe(false);
  });
});

describe("applyDismissals (ODY-905)", () => {
  const msg = (
    partId: string,
    message: string,
    severity: Flag["severity"] = "warn",
  ): Flag => ({
    partId,
    blockId: "b",
    message,
    severity,
  });
  const dismissal = (
    key: Partial<ScanFlagKey>,
    dismissedAt = "2026-11-09T10:00:00.000Z",
    dismissedBy: string | null = "Ada Lovelace",
  ): ScanDismissal => ({
    checkId: "c1",
    ruleId: "a",
    partId: "11",
    blockId: "b",
    message: "one",
    ...key,
    dismissedAt,
    dismissedBy,
  });
  // c1 needs attention from two flags; s1 passes; m1 couldn't check; s2 not run
  const view = () =>
    build(
      scanOf([
        result("c1", "warn", [
          ruleResult("a", "warn", [msg("11", "one"), msg("12", "two")]),
        ]),
        result("s1", "pass"),
        result("m1", "unknown", [
          ruleResult("a", "unknown", [
            {
              partId: "droplet",
              blockId: null,
              message: "failed",
              severity: "unknown",
            },
          ]),
        ]),
      ]),
    );
  const checkOf = (v: ReturnType<typeof build>, id: string) =>
    allChecks(v).find((c) => c.id === id)!;

  it("changes nothing with no dismissals", () => {
    expect(applyDismissals(view(), [])).toEqual(view());
  });

  it("matches only when all five fields are equal", () => {
    const v = applyDismissals(view(), [
      dismissal({ message: "One" }),
      dismissal({ blockId: null }),
      dismissal({ ruleId: "b" }),
      dismissal({ checkId: "s1" }),
      dismissal({ partId: "12" }),
    ]);
    expect(v).toEqual(view());
  });

  it("passes a check once all its flags are dismissed, and moves the count", () => {
    const v = applyDismissals(view(), [
      dismissal({}),
      dismissal(
        { partId: "12", message: "two" },
        "2026-11-09T11:00:00.000Z",
        null,
      ),
    ]);
    const c1 = checkOf(v, "c1");
    expect(c1).toMatchObject({
      status: "pass",
      savedStatus: "warn",
      flagCount: 0,
      dismissedCount: 2,
    });
    expect(c1.rules[0]).toMatchObject({ status: "pass", flags: [] });
    expect(c1.rules[0].dismissed).toEqual([
      expect.objectContaining({ message: "one", dismissedBy: "Ada Lovelace" }),
      expect.objectContaining({ message: "two", dismissedBy: null }),
    ]);
    expect(v.counts).toEqual({
      passed: 2,
      needsAttention: 0,
      couldNotCheck: 1,
    });
  });

  it("keeps a check that still has a flag needing attention", () => {
    const c1 = checkOf(applyDismissals(view(), [dismissal({})]), "c1");
    expect(c1).toMatchObject({
      status: "warn",
      flagCount: 1,
      dismissedCount: 1,
    });
  });

  it("keeps warn when only a couldn't-check flag beside a warn flag is dismissed", () => {
    const v = build(
      scanOf([
        result("c1", "warn", [
          ruleResult("a", "warn", [
            msg("11", "one"),
            msg("11", "hmm", "unknown"),
          ]),
        ]),
      ]),
    );
    const c1 = checkOf(
      applyDismissals(v, [dismissal({ message: "hmm" })]),
      "c1",
    );
    expect(c1.status).toBe("warn");
  });

  it("passes a rule that failed once its error flag is dismissed", () => {
    const v = applyDismissals(view(), [
      dismissal({
        checkId: "m1",
        partId: "droplet",
        blockId: null,
        message: "failed",
      }),
    ]);
    expect(checkOf(v, "m1").status).toBe("pass");
    expect(v.counts.couldNotCheck).toBe(0);
  });

  it("shows the earliest of two dismissals for one flag", () => {
    const v = applyDismissals(view(), [
      dismissal({}, "2026-11-09T12:00:00.000Z", "Grace Hopper"),
      dismissal({}, "2026-11-09T09:00:00.000Z", "Ada Lovelace"),
    ]);
    expect(checkOf(v, "c1").rules[0].dismissed).toEqual([
      expect.objectContaining({
        dismissedBy: "Ada Lovelace",
        dismissedAt: "2026-11-09T09:00:00.000Z",
      }),
    ]);
  });

  it("leaves a check that hasn't run alone", () => {
    const v = applyDismissals(view(), [dismissal({ checkId: "s2" })]);
    expect(checkOf(v, "s2")).toEqual(checkOf(view(), "s2"));
  });
});

describe("flag keys", () => {
  const key: ScanFlagKey = {
    checkId: "c1",
    ruleId: "a",
    partId: "11",
    blockId: "b",
    message: "one",
  };

  it("puts each flag's key on its view", () => {
    const v = build(
      scanOf([
        result("c1", "warn", [
          ruleResult("a", "warn", [{ ...key, severity: "warn" }]),
        ]),
      ]),
    );
    expect(allChecks(v)[0].rules[0].flags[0].key).toEqual(key);
  });

  it("gives each flag a stable element id that differs when the key does", () => {
    expect(scanFlagDomId(key)).toBe(scanFlagDomId({ ...key }));
    expect(scanFlagDomId(key)).toMatch(/^scan-flag-[a-z0-9]+$/);
    expect(scanFlagDomId(key)).not.toBe(
      scanFlagDomId({ ...key, message: "two" }),
    );
    expect(flagKeyId(key)).not.toBe(flagKeyId({ ...key, blockId: null }));
  });
});
