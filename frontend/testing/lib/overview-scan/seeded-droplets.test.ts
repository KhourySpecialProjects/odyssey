/** @jest-environment node */
import type { LookupFunction } from "node:net";

import { CHECKS } from "@/lib/overview-scan/checks";
import { createSafeFetcher, type Send } from "@/lib/overview-scan/network";
import { runChecks } from "@/lib/overview-scan/run";
import { buildScanDocument } from "@/lib/overview-scan/snapshot";
import type { ScanResult } from "@/lib/overview-scan/types";
import {
  CLEAN,
  EXPECTED,
  LIMITS,
  LIMITS_IMAGES_FLAG,
  PROBLEMS,
  SSRF_FLAG,
  WEB,
  type SeedDroplet,
} from "@/testing/mocks/overview-scan-droplets";

// The droplets the end-to-end check seeds (ODY-796), run through the real
// snapshot, all 23 checks and the safe fetcher. Only the network is faked:
// send answers from WEB, and every name resolves to a public address.

const requested: URL[] = [];

const send: Send = async ({ url }) => {
  requested.push(url);
  const res = WEB[url.href];
  if (!res) throw new Error(`no WEB entry for ${url.href}`);
  return res;
};

const publicLookup = ((_host, _options, callback) => {
  process.nextTick(() =>
    (callback as (e: null, a: { address: string; family: number }[]) => void)(
      null,
      [{ address: "93.184.215.14", family: 4 }],
    ),
  );
}) as LookupFunction;

function scan({ droplet, lessons }: SeedDroplet): Promise<ScanResult> {
  const doc = buildScanDocument(droplet, lessons);
  return runChecks(
    doc,
    CHECKS,
    createSafeFetcher({ send, lookup: publicLookup }),
  );
}

const messages = (result: ScanResult, checkId: string) =>
  result.results
    .find((c) => c.id === checkId)!
    .rules.flatMap((r) => r.flags.map((f) => f.message));

beforeEach(() => {
  jest.clearAllMocks();
  requested.length = 0;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

it("runs 23 checks made of 49 rules", () => {
  expect(CHECKS).toHaveLength(23);
  expect(CHECKS.flatMap((c) => c.rules)).toHaveLength(49);
  expect(Object.keys(EXPECTED).sort()).toEqual(CHECKS.map((c) => c.id).sort());
});

it("passes every check on the clean droplet", async () => {
  const result = await scan(CLEAN);

  const notPassed = result.results
    .filter((c) => c.status !== "pass")
    .map((c) => ({ id: c.id, flags: messages(result, c.id) }));
  expect(notPassed).toEqual([]);
  expect(result).toMatchObject({
    passed: 23,
    needsAttention: 0,
    couldNotCheck: 0,
  });
});

describe("the problem droplet", () => {
  let result: ScanResult;

  beforeAll(async () => {
    result = await scan(PROBLEMS);
  });

  it("needs attention on every check", () => {
    expect(result.results.filter((c) => c.status !== "warn")).toEqual([]);
    expect(result.needsAttention).toBe(23);
  });

  it.each(Object.entries(EXPECTED))("%s raises its seeded flag", (id, flag) => {
    expect(messages(result, id)).toContain(flag);
  });
});

it("refuses the link-local address without requesting it", async () => {
  const result = await scan(PROBLEMS);

  expect(messages(result, "links")).toContain(SSRF_FLAG);
  expect(requested.map((u) => u.hostname)).toContain("www.example.com");
  expect(requested.map((u) => u.hostname)).not.toContain("169.254.169.254");
});

it("can't check a relative image on the limits droplet", async () => {
  const result = await scan(LIMITS);
  const images = result.results.find((c) => c.id === "images")!;

  expect(images.status).toBe("unknown");
  expect(messages(result, "images")).toEqual([LIMITS_IMAGES_FLAG]);
});
