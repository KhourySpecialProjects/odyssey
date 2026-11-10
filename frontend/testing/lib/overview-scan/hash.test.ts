/** @jest-environment node */
import { hashScanDocument } from "@/lib/overview-scan/hash";
import {
  buildScanDocument,
  type ScanSourceDroplet,
  type ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";

const droplet = (extra: object = {}): ScanSourceDroplet =>
  ({
    id: 7,
    name: "D",
    overview: "<p>hello</p>",
    ...extra,
  }) as ScanSourceDroplet;
const lesson = (id: number, extra: object = {}): ScanSourceLesson =>
  ({
    id,
    name: `L${id}`,
    blocksVersion: "v2",
    blocksV2: [
      {
        id: `b${id}`,
        type: "paragraph",
        content: [{ type: "text", text: "hi" }],
      },
    ],
    ...extra,
  }) as ScanSourceLesson;

const hashOf = (d = droplet(), lessons = [lesson(1), lesson(2)]) =>
  hashScanDocument(buildScanDocument(d, lessons));

describe("hashScanDocument (ODY-878)", () => {
  it("is a sha256 hex digest that does not depend on key order", () => {
    expect(hashOf()).toMatch(/^[0-9a-f]{64}$/);
    expect(hashScanDocument({ a: 1, b: { c: 2, d: 3 } } as never)).toBe(
      hashScanDocument({ b: { d: 3, c: 2 }, a: 1 } as never),
    );
  });

  it("ignores lock and timestamp writes, which are not in the document", () => {
    const locked = lesson(1, {
      lockedAt: "2026-11-10T10:00:00.000Z",
      lockedBy: 3,
      updatedAt: "2026-11-10T10:00:30.000Z",
    });
    expect(
      hashOf(droplet({ updatedAt: "2026-11-10T11:00:00.000Z" }), [
        locked,
        lesson(2),
      ]),
    ).toBe(hashOf());
  });

  it.each([
    ["a droplet edit", () => hashOf(droplet({ overview: "<p>changed</p>" }))],
    [
      "a lesson edit",
      () => hashOf(droplet(), [lesson(1, { name: "Renamed" }), lesson(2)]),
    ],
    ["a deleted lesson", () => hashOf(droplet(), [lesson(1)])],
    [
      "an added dataset",
      () =>
        hashOf(
          droplet({
            datasets: [{ name: "n", fileUrl: "https://x.test/a.csv" }],
          }),
        ),
    ],
  ])("changes with %s", (_name, changed) => {
    expect(changed()).not.toBe(hashOf());
  });
});
