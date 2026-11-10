import { CONFIG } from "@/lib/overview-scan/config";
import type { FetchUrl } from "@/lib/overview-scan/network";
import { CONTENT_CHECKS } from "@/lib/overview-scan/rules/content";
import { confirmMisspellings } from "@/lib/overview-scan/spelling";
import { sentenceAround } from "@/lib/overview-scan/text";
import type { ScanBlock, ScanDocument } from "@/lib/overview-scan/types";
import { lesson, scanDoc } from "@/testing/mocks/overview-scan";

// The dictionary rule with its AI double-check mocked (ODY-904). unknownWords
// stays real, so the dictionary still decides what is sent.
jest.mock("@/lib/overview-scan/spelling", () => ({
  ...jest.requireActual("@/lib/overview-scan/spelling"),
  confirmMisspellings: jest.fn(),
}));

const confirm = jest.mocked(confirmMisspellings);
const noFetch: FetchUrl = () => {
  throw new Error("a content rule fetched a URL");
};
const dictionary = (doc: ScanDocument) =>
  CONTENT_CHECKS.find((c) => c.id === "spelling")!
    .rules.find((r) => r.id === "dictionary")!
    .run(doc, noFetch);

const p = (id: string, text: string): ScanBlock => ({
  id,
  type: "paragraph",
  text,
});
const NOT_KNOWN = "in the dictionary or the tech word list.";
const warn = (partId: string, blockId: string | null, message: string) => ({
  partId,
  blockId,
  message,
  severity: "warn",
});
const note = (message: string) => ({
  partId: "droplet",
  blockId: null,
  message,
  severity: "unknown",
});
/** The model calls these words misspelled: their ids in the items sent */
const misspelledAre = (...words: string[]) =>
  confirm.mockImplementation(async (items) => ({
    ok: true,
    misspelled: new Set(
      items.flatMap((item, id) => (words.includes(item.word) ? [id] : [])),
    ),
  }));

const TYPOS = scanDoc({
  droplet: { description: "Wich one?" },
  lessons: [
    lesson([p("a", "We recieve the file untill noon.")], 1, "Teh basics"),
  ],
});

beforeEach(() => jest.clearAllMocks());

describe("spelling/dictionary with the AI double-check (ODY-904)", () => {
  it("keeps only the words the AI calls misspelled", async () => {
    misspelledAre("recieve", "Wich");

    expect(await dictionary(TYPOS)).toEqual([
      warn("1", "a", `"recieve" isn't ${NOT_KNOWN}`),
      warn("droplet", "description", `"Wich" isn't ${NOT_KNOWN}`),
    ]);
  });

  it("sends every unknown word once, with its sentence, in one call", async () => {
    misspelledAre();
    const doc = scanDoc({
      lessons: [
        lesson([
          p("a", "Ada Okonjo wrote it. Then Okonjo left."),
          p("b", "Store it in totalscore. Pandera checks the frame."),
        ]),
      ],
    });

    expect(await dictionary(doc)).toEqual([]);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toEqual([
      { word: "Okonjo", sentence: "Ada Okonjo wrote it." },
      { word: "totalscore", sentence: "Store it in totalscore." },
      { word: "Pandera", sentence: "Pandera checks the frame." },
    ]);
  });

  it("makes no call when the dictionary flags nothing", async () => {
    expect(
      await dictionary(scanDoc({ lessons: [lesson([p("a", "All fine.")])] })),
    ).toEqual([]);
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each([
    [
      "failed",
      "The AI double-check didn't run, so these are the dictionary's flags.",
    ],
    [
      "budget",
      "The AI double-check didn't run because this month's AI budget is used up, so these are the dictionary's flags.",
    ],
  ] as const)(
    "keeps the dictionary's flags, with a note, when the check gives %s",
    async (reason, message) => {
      confirm.mockResolvedValue({ ok: false, reason });

      expect(await dictionary(TYPOS)).toEqual([
        warn("1", null, `"Teh" isn't ${NOT_KNOWN}`),
        warn("1", "a", `"recieve" and "untill" aren't ${NOT_KNOWN}`),
        warn("droplet", "description", `"Wich" isn't ${NOT_KNOWN}`),
        note(message),
      ]);
    },
  );

  it("keeps words past the call's limit flagged, without sending them", async () => {
    misspelledAre();
    const many = Array.from(
      { length: CONFIG.aiSpellingMaxWords + 2 },
      (_, i) => `zq${String.fromCharCode(97 + (i % 26))}${i}x`,
    )
      .map((w) => w.replace(/\d/g, (d) => "abcdefghij"[Number(d)]))
      .join(" ");

    const flags = await dictionary(
      scanDoc({ lessons: [lesson([p("a", many)])] }),
    );

    expect(confirm.mock.calls[0][0]).toHaveLength(CONFIG.aiSpellingMaxWords);
    expect(flags).toHaveLength(1);
    expect(flags[0].message.match(/"/g)).toHaveLength(4); // two words kept
  });
});

describe("sentenceAround", () => {
  it("finds the sentence with the word, as a whole word", () => {
    expect(sentenceAround("A totals list. The total is here.", "total")).toBe(
      "The total is here.",
    );
  });

  it("falls back to the whole text, and clips a long sentence around the word", () => {
    expect(sentenceAround("no match here", "zzz")).toBe("no match here");
    const long = `${"a ".repeat(300)}teh ${"b ".repeat(300)}`;
    const clipped = sentenceAround(long, "teh");
    expect(clipped).toHaveLength(300);
    expect(clipped).toContain("teh");
  });
});
