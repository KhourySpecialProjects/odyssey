import type {
  FetchUrl,
  RefusedReason,
  UncheckedReason,
  UrlCheck,
} from "@/lib/overview-scan/network";
import { MEDIA_CHECKS } from "@/lib/overview-scan/rules/media";
import type {
  Flag,
  ScanBlock,
  ScanDataset,
  ScanDocument,
} from "@/lib/overview-scan/types";
import {
  TEST_CDN,
  lesson,
  sampleScanDocument,
  sampleWeb,
  scanDoc,
} from "@/testing/mocks/overview-scan";

// The offline rules must never fetch
const noFetch: FetchUrl = () => {
  throw new Error("an offline rule fetched a URL");
};

function run(
  checkId: string,
  ruleId: string,
  doc: ScanDocument,
  fetchUrl: FetchUrl = noFetch,
) {
  const rule = MEDIA_CHECKS.find((c) => c.id === checkId)?.rules.find(
    (r) => r.id === ruleId,
  );
  if (!rule) throw new Error(`no rule ${checkId}/${ruleId}`);
  return rule.run(doc, fetchUrl);
}

const withBlock = (block: ScanBlock) => scanDoc({ lessons: [lesson([block])] });

// Expected flags on the one block (id "b") of lesson 1
const on = (...messages: string[]) =>
  messages.map((message) => ({
    partId: "1",
    blockId: "b",
    message,
    severity: "warn",
  }));

const image = (caption: string): ScanBlock => ({
  id: "b",
  type: "image",
  url: "https://cdn.odyssey.test/a.png",
  caption,
});
const linked = (
  text: string,
  url = "https://pandas.pydata.org/",
): ScanBlock => ({
  id: "b",
  type: "paragraph",
  text,
  links: [{ text, url }],
});
const heading = (n: number): ScanBlock => ({
  id: "b",
  type: "heading",
  level: 2,
  text: Array.from({ length: n }, (_, i) => `word${i}`).join(" "),
});
const mc = (
  question: string,
  options: [string, boolean][] = [
    ["A DataFrame", true],
    ["A list", false],
  ],
): ScanBlock => ({
  id: "b",
  type: "quiz-mc",
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
});
const tf = (question: string): ScanBlock => ({
  id: "b",
  type: "quiz-tf",
  question,
  correctAnswer: true,
});
const open = (question: string, correctAnswer: string): ScanBlock => ({
  id: "b",
  type: "quiz-open",
  question,
  correctAnswer,
});
const codeBlock = (
  over: Partial<Extract<ScanBlock, { type: "code" }>> = {},
): ScanBlock => ({
  id: "b",
  type: "code",
  variant: "code",
  language: "python",
  code: "print(1)",
  runnable: true,
  ...over,
});
const sandpack = (
  template: string,
  files: Record<string, string>,
): ScanBlock => ({
  id: "b",
  type: "sandpack",
  template,
  files,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the offline media rules", () => {
  it.each<[string, string, string, ScanBlock, string[]]>([
    ["accessibility", "image-captions", "a caption", image("A chart"), []],
    [
      "accessibility",
      "image-captions",
      "no caption",
      image(""),
      ['This image has no caption, so screen readers only hear "Image".'],
    ],
    [
      "accessibility",
      "image-captions",
      "a blank caption",
      image("  "),
      ['This image has no caption, so screen readers only hear "Image".'],
    ],
    [
      "accessibility",
      "link-text",
      "descriptive text",
      linked("pandas guide"),
      [],
    ],
    ...["Click here", "read more", "https://x.org", "www.x.org"].map(
      (text): [string, string, string, ScanBlock, string[]] => [
        "accessibility",
        "link-text",
        `"${text}"`,
        linked(text),
        [`The link text "${text}" doesn't say where it goes.`],
      ],
    ),
    [
      "accessibility",
      "link-text",
      "a mailto link reading here",
      linked("here", "mailto:a@example.com"),
      ['The link text "here" doesn\'t say where it goes.'],
    ],
    ["accessibility", "heading-length", "12 words", heading(12), []],
    [
      "accessibility",
      "heading-length",
      "13 words",
      heading(13),
      [
        "This heading is 13 words (limit 12). A sentence made into a heading confuses screen-reader navigation.",
      ],
    ],
    [
      "quizzes",
      "question-text",
      "a multiple-choice question",
      mc("Pick one"),
      [],
    ],
    ["quizzes", "question-text", "a true/false question", tf("True?"), []],
    [
      "quizzes",
      "question-text",
      "a blank multiple-choice question",
      mc(" "),
      ["This question has no text."],
    ],
    [
      "quizzes",
      "question-text",
      "a blank true/false question",
      tf(""),
      ["This question has no text."],
    ],
    ["quizzes", "options", "a valid question", mc("Pick one"), []],
    [
      "quizzes",
      "options",
      "one option",
      mc("Pick one", [["Only", true]]),
      ["This question has fewer than 2 options."],
    ],
    [
      "quizzes",
      "options",
      "a blank option",
      mc("Pick one", [
        ["A", true],
        [" ", false],
      ]),
      ["This question has a blank option."],
    ],
    [
      "quizzes",
      "options",
      "a repeated option",
      mc("Pick one", [
        ["A", true],
        [" a ", false],
      ]),
      ["This question repeats an option."],
    ],
    [
      "quizzes",
      "options",
      "none correct",
      mc("Pick one", [
        ["A", false],
        ["B", false],
      ]),
      ["No option is marked correct."],
    ],
    [
      "quizzes",
      "options",
      "every problem at once",
      mc("Pick one", [["", false]]),
      [
        "This question has fewer than 2 options.",
        "This question has a blank option.",
        "No option is marked correct.",
      ],
    ],
    ["quizzes", "options", "a true/false question", tf("True?"), []],
    ["open-ended", "question-text", "a question", open("Why?", "Because."), []],
    [
      "open-ended",
      "question-text",
      "a blank question",
      open("", "Because."),
      ["This question has no text."],
    ],
    [
      "open-ended",
      "model-answer",
      "a model answer",
      open("Why?", "Because."),
      [],
    ],
    [
      "open-ended",
      "model-answer",
      "no model answer",
      open("Why?", " "),
      ["This question has no model answer to grade against."],
    ],
    ["code", "has-code", "code", codeBlock(), []],
    ["code", "has-code", "a notebook", codeBlock({ variant: "notebook" }), []],
    [
      "code",
      "has-code",
      "a Sandpack file",
      sandpack("react", { "/App.js": "x" }),
      [],
    ],
    [
      "code",
      "has-code",
      "blank code",
      codeBlock({ code: " \n" }),
      ["This code block is empty."],
    ],
    [
      "code",
      "has-code",
      "a blank notebook",
      codeBlock({ variant: "notebook", code: "" }),
      ["This notebook block is empty."],
    ],
    ...([{}, { "/a.js": " " }] as Record<string, string>[]).map(
      (files): [string, string, string, ScanBlock, string[]] => [
        "code",
        "has-code",
        `Sandpack files ${JSON.stringify(files)}`,
        sandpack("react", files),
        ["This Sandpack block has no files with code."],
      ],
    ),
    ["code", "language", "runnable python", codeBlock(), []],
    ["code", "language", "runnable c++", codeBlock({ language: "c++" }), []],
    [
      "code",
      "language",
      "runnable sql",
      codeBlock({ language: "sql" }),
      ['The code runner doesn\'t support "sql".'],
    ],
    [
      "code",
      "language",
      "runnable, no language",
      codeBlock({ language: null }),
      ["This code block has no language set."],
    ],
    [
      "code",
      "language",
      "display-only json",
      codeBlock({ language: "json", runnable: false }),
      [],
    ],
    [
      "code",
      "language",
      "display-only, no language",
      codeBlock({ language: null, runnable: false }),
      [],
    ],
    [
      "code",
      "language",
      "a notebook saying r",
      codeBlock({ variant: "notebook", language: "r" }),
      [],
    ],
    [
      "code",
      "language",
      "Sandpack react-ts",
      sandpack("react-ts", { "/App.tsx": "x" }),
      [],
    ],
    [
      "code",
      "language",
      "Sandpack angular",
      sandpack("angular", { "/app.ts": "x" }),
      ['Sandpack doesn\'t support the "angular" template.'],
    ],
  ])("%s / %s: %s", async (checkId, ruleId, _label, block, messages) => {
    expect(await run(checkId, ruleId, withBlock(block))).toEqual(
      on(...messages),
    );
  });

  it.each([
    ["A fact.", []],
    [
      " ",
      [
        {
          partId: "droplet",
          blockId: "fun-fact",
          message: "There's no fun fact.",
          severity: "warn",
        },
      ],
    ],
  ])("fun-fact / not-empty: %p", async (funFact, expected) => {
    expect(
      await run("fun-fact", "not-empty", scanDoc({ droplet: { funFact } })),
    ).toEqual(expected);
  });
});

// --- The network checks: Images, Videos, Links and Datasets ---

const CDN_PNG = `${TEST_CDN}/a.png`;
const MB = 1024 * 1024;

const loaded = (
  contentType: string | null = "text/html",
  bytes: number | null = null,
): UrlCheck => ({
  kind: "loaded",
  finalUrl: "https://final.test/",
  status: 200,
  contentType,
  bytes,
});
const broken = (status: number | null): UrlCheck => ({
  kind: "broken",
  finalUrl: "https://final.test/",
  status,
});
const refused = (reason: RefusedReason): UrlCheck => ({
  kind: "refused",
  finalUrl: "https://final.test/",
  reason,
});
const unchecked = (reason: UncheckedReason): UrlCheck => ({
  kind: "unchecked",
  finalUrl: "https://final.test/",
  reason,
});

/** Answers from `web` (anything else loads as HTML) and records every URL asked for. */
const stubFetch = (web: Record<string, UrlCheck> = {}) =>
  jest.fn(async (url: string) => web[url] ?? loaded());

/** Every URL gets the same answer. */
const answerAll = (result: UrlCheck) =>
  jest.fn(async (): Promise<UrlCheck> => result);

const severityAndMessage = (flags: Flag[]) =>
  flags.map((f) => [f.severity, f.message]);

const imageAt = (url: string): ScanBlock => ({
  id: "b",
  type: "image",
  url,
  caption: "A chart",
});
const video = (url: string): ScanBlock => ({ id: "b", type: "video", url });
const withDataset = (
  dataset: Partial<ScanDataset> = {},
  blocks: ScanBlock[] = [],
) =>
  scanDoc({
    droplet: {
      datasets: [
        {
          name: "checkouts.csv",
          fileUrl: `${TEST_CDN}/checkouts.csv`,
          rowCount: 1200,
          ...dataset,
        },
      ],
    },
    lessons: [lesson(blocks)],
  });

describe("the network media rules", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.AWS_CDN_URL = TEST_CDN;
    delete process.env.AWS_S3_BUCKET_URL;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it.each<[string, UrlCheck, string, string]>([
    ["404", broken(404), "warn", "This image doesn't load (404 Not Found)."],
    ["400", broken(400), "warn", "This image doesn't load (400)."],
    [
      "a site that doesn't exist",
      broken(null),
      "warn",
      "This image doesn't load: the site doesn't exist.",
    ],
    [
      "a private address",
      refused("private-address"),
      "warn",
      "This image wasn't fetched: private or internal address.",
    ],
    [
      "another scheme",
      refused("unsupported-scheme"),
      "warn",
      "This image wasn't fetched: not a web address.",
    ],
    [
      "an invalid URL",
      refused("invalid-url"),
      "warn",
      "This image wasn't fetched: not a valid web address.",
    ],
    [
      "a timeout",
      unchecked("timeout"),
      "unknown",
      "This image didn't answer within 5 s.",
    ],
    [
      "the scan's time running out",
      unchecked("budget"),
      "unknown",
      "This image wasn't checked before the scan's time ran out.",
    ],
    [
      "too many redirects",
      unchecked("too-many-redirects"),
      "unknown",
      "This image redirects too many times to check.",
    ],
    [
      "a 429",
      unchecked("rate-limited"),
      "unknown",
      "This image asked us to slow down (429), so it wasn't checked.",
    ],
    [
      "a network error",
      unchecked("network-error"),
      "unknown",
      "This image couldn't be reached.",
    ],
  ])("a URL result of %s", async (_label, result, severity, message) => {
    const doc = withBlock(imageAt(CDN_PNG));
    expect(
      severityAndMessage(await run("images", "loads", doc, answerAll(result))),
    ).toEqual([[severity, message]]);
    // The size rule leaves results that didn't load to the loads rule
    expect(await run("images", "size", doc, answerAll(result))).toEqual([]);
  });

  describe("images", () => {
    it.each<[string, string, UrlCheck | null, string[], string[]]>([
      ["a 1 MB PNG", CDN_PNG, loaded("image/png", MB), [], []],
      [
        "an HTML page",
        CDN_PNG,
        loaded("text/html"),
        ["This URL loads, but it isn't an image."],
        [],
      ],
      [
        "no content type",
        CDN_PNG,
        loaded(null),
        ["This URL loads, but it isn't an image."],
        [],
      ],
      [
        "a 3.4 MB PNG",
        CDN_PNG,
        loaded("image/png", Math.round(3.4 * MB)),
        [],
        ["This image is 3.4 MB (limit 2 MB)."],
      ],
      ["a PNG with no size", CDN_PNG, loaded("image/png", null), [], []],
      // null: an inline image, which is never fetched
      ["an inline PNG", "data:image/png;base64,iVBORw0K", null, [], []],
      [
        "a 3 MB inline PNG",
        `data:image/png;base64,${"A".repeat(4 * MB)}`,
        null,
        [],
        ["This image is 3.0 MB (limit 2 MB)."],
      ],
      ["an inline SVG", "data:image/svg+xml,<svg/>", null, [], []],
    ])("%s", async (_label, url, result, loads, size) => {
      const fetchUrl = answerAll(result ?? loaded());
      const doc = withBlock(imageAt(url));
      expect(await run("images", "loads", doc, fetchUrl)).toEqual(on(...loads));
      expect(await run("images", "size", doc, fetchUrl)).toEqual(on(...size));
      if (result === null) expect(fetchUrl).not.toHaveBeenCalled();
    });

    it("doesn't fetch a relative image and says it couldn't check it", async () => {
      const fetchUrl = stubFetch();
      const doc = withBlock(imageAt("/uploads/a.png"));
      expect(
        severityAndMessage(await run("images", "loads", doc, fetchUrl)),
      ).toEqual([
        [
          "unknown",
          "This image has a relative address (/uploads/a.png), so it wasn't checked.",
        ],
      ]);
      expect(await run("images", "size", doc, fetchUrl)).toEqual([]);
      expect(fetchUrl).not.toHaveBeenCalled();
    });

    it("asks for the same URL from both rules, so the fetcher's cache shares it", async () => {
      const fetchUrl = stubFetch({ [CDN_PNG]: loaded("image/png", MB) });
      const doc = withBlock(imageAt(CDN_PNG));
      await run("images", "loads", doc, fetchUrl);
      await run("images", "size", doc, fetchUrl);
      expect(fetchUrl.mock.calls).toEqual([[CDN_PNG], [CDN_PNG]]);
    });

    it("fetches every image at once and reports them in document order", async () => {
      const urls = ["a", "b", "c"].map((n) => `${TEST_CDN}/${n}.png`);
      const doc = scanDoc({
        lessons: [
          lesson(urls.map((url, i) => ({ ...imageAt(url), id: `img${i}` }))),
        ],
      });
      // Nothing answers until all three were asked for, then they answer in
      // reverse order. A rule that awaited each URL in turn would hang.
      const waiting: (() => void)[] = [];
      const fetchUrl: FetchUrl = (url) =>
        new Promise((resolve) => {
          waiting.push(() =>
            resolve(url.endsWith("b.png") ? loaded("image/png") : loaded()),
          );
          if (waiting.length === urls.length)
            waiting.reverse().forEach((answer) => answer());
        });
      expect(
        (await run("images", "loads", doc, fetchUrl)).map((f) => f.blockId),
      ).toEqual(["img0", "img2"]);
    });
  });

  describe("videos", () => {
    it.each<[string, string, boolean]>([
      ["youtu.be", "https://youtu.be/abc", true],
      ["player.vimeo.com", "https://player.vimeo.com/video/123", true],
      ["Odyssey's CDN", `${TEST_CDN}/v.mp4`, true],
      ["another site", "https://www.dailymotion.com/x", false],
    ])("allowed-host: %s", async (_label, url, allowed) => {
      expect(
        await run("videos", "allowed-host", withBlock(video(url))),
      ).toEqual(
        allowed
          ? []
          : on(`Videos from ${new URL(url).hostname} aren't allowed.`),
      );
    });

    it("allowed-host: reads Odyssey's media hosts from the environment at run time", async () => {
      const doc = withBlock(video(`${TEST_CDN}/v.mp4`));
      delete process.env.AWS_CDN_URL;
      expect(await run("videos", "allowed-host", doc)).toEqual(
        on("Videos from cdn.odyssey.test aren't allowed."),
      );

      process.env.AWS_S3_BUCKET_URL = TEST_CDN;
      expect(await run("videos", "allowed-host", doc)).toEqual([]);
    });

    const youtubeOembed = `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=abc")}&format=json`;

    it.each<[string, string]>([
      ["https://www.youtube.com/watch?v=abc", youtubeOembed],
      ["https://youtu.be/abc?t=3", youtubeOembed],
      ["https://www.youtube.com/embed/abc", youtubeOembed],
      ["https://www.youtube.com/shorts/abc", youtubeOembed],
      ["https://youtube.com/watch?feature=x&v=abc", youtubeOembed],
      [
        "https://vimeo.com/123",
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent("https://vimeo.com/123")}`,
      ],
      [`${TEST_CDN}/v.mp4`, `${TEST_CDN}/v.mp4`],
    ])("exists: %s is checked at %s", async (url, target) => {
      const fetchUrl = stubFetch();
      expect(
        await run("videos", "exists", withBlock(video(url)), fetchUrl),
      ).toEqual([]);
      expect(fetchUrl.mock.calls).toEqual([[target]]);
    });

    it.each<[string, UrlCheck, string[]]>([
      [
        "a private video",
        broken(403),
        ["This video doesn't load (403 Forbidden)."],
      ],
      ["a public video", loaded("application/json"), []],
    ])("exists: %s", async (_label, result, messages) => {
      expect(
        await run(
          "videos",
          "exists",
          withBlock(video("https://youtu.be/abc")),
          answerAll(result),
        ),
      ).toEqual(on(...messages));
    });

    it("exists: flags a YouTube link with no video in it, without fetching", async () => {
      const fetchUrl = stubFetch();
      expect(
        await run(
          "videos",
          "exists",
          withBlock(video("https://www.youtube.com/")),
          fetchUrl,
        ),
      ).toEqual(on("This video link doesn't point at a YouTube video."));
      expect(fetchUrl).not.toHaveBeenCalled();
    });
  });

  describe("links", () => {
    it.each<[string, string, UrlCheck, string[]]>([
      ["a 200", "https://pandas.pydata.org/", loaded(), []],
      [
        "a 404",
        "https://x.org/gone",
        broken(404),
        ['The link "guide" doesn\'t load (404 Not Found).'],
      ],
      [
        "a private address",
        "https://intranet.test/",
        refused("private-address"),
        ['The link "guide" wasn\'t fetched: private or internal address.'],
      ],
      [
        "no scheme",
        "www.example.com",
        refused("invalid-url"),
        ['The link "guide" wasn\'t fetched: not a valid web address.'],
      ],
    ])("answers: %s", async (_label, url, result, messages) => {
      const fetchUrl = answerAll(result);
      expect(
        await run(
          "links",
          "answers",
          withBlock(linked("guide", url)),
          fetchUrl,
        ),
      ).toEqual(on(...messages));
      expect(fetchUrl.mock.calls).toEqual([[url]]);
    });

    it.each(["/droplets/x", "#top", "?tab=2", "mailto:a@b.org", "tel:+1617"])(
      "answers: doesn't fetch %s",
      async (url) => {
        const fetchUrl = stubFetch();
        expect(
          await run(
            "links",
            "answers",
            withBlock(linked("guide", url)),
            fetchUrl,
          ),
        ).toEqual([]);
        expect(fetchUrl).not.toHaveBeenCalled();
      },
    );

    it("answers: checks next steps, naming an unlabelled one by its URL", async () => {
      const url = "https://x.org/gone";
      expect(
        await run(
          "links",
          "answers",
          scanDoc({ droplet: { nextSteps: [{ label: "", url }] } }),
          answerAll(broken(404)),
        ),
      ).toEqual([
        {
          partId: "droplet",
          blockId: "next-steps",
          message: `The link "${url}" doesn't load (404 Not Found).`,
          severity: "warn",
        },
      ]);
    });

    it.each<[string, boolean]>([
      ["https://x.org/", false],
      ["http://x.org/", true],
      ["HTTP://x.org/", true],
      ["ftp://x.org/", false],
      ["mailto:a@b.org", false],
    ])("https: %s", async (url, flagged) => {
      expect(
        await run("links", "https", withBlock(linked("guide", url))),
      ).toEqual(flagged ? on('The link "guide" uses http, not https.') : []);
    });

    it.each<[string, string | null]>([
      ["http://localhost:3000/", "localhost"],
      ["http://127.0.0.1/", "127.0.0.1"],
      ["http://[::1]/", "[::1]"],
      ["https://dev.khouryodyssey.org/", "dev.khouryodyssey.org"],
      ["https://dev2.khouryodyssey.org/", "dev2.khouryodyssey.org"],
      ["https://dev.data.khouryodyssey.org/", "dev.data.khouryodyssey.org"],
      ["https://staging.example.com/", "staging.example.com"],
      ["https://khouryodyssey.org/", null],
      ["https://dev.to/post", null],
      ["https://devops.example.com/", null],
      ["https://127.example.com/", null],
    ])("not-dev: %s", async (url, host) => {
      expect(
        await run("links", "not-dev", withBlock(linked("guide", url))),
      ).toEqual(
        host
          ? on(
              `The link "guide" points at ${host}, which students can't reach.`,
            )
          : [],
      );
    });
  });

  describe("datasets", () => {
    const onDatasets = (...messages: string[]) =>
      messages.map((message) => ({
        partId: "droplet",
        blockId: "datasets",
        message,
        severity: "warn",
      }));

    it.each<[string, number | null, UrlCheck, string[]]>([
      ["1,200 rows", 1200, loaded("text/csv", 96000), []],
      [
        "0 rows",
        0,
        loaded("text/csv", 96000),
        ['The dataset "checkouts.csv" has no rows.'],
      ],
      [
        "an unknown count and an empty file",
        null,
        loaded("text/csv", 0),
        ['The dataset "checkouts.csv" has no rows.'],
      ],
      ["an unknown count and a 5 KB file", null, loaded("text/csv", 5000), []],
      ["an unknown count and size", null, loaded("text/csv", null), []],
      [
        "a 404",
        1200,
        broken(404),
        ['The dataset "checkouts.csv" doesn\'t load (404 Not Found).'],
      ],
    ])("loads: %s", async (_label, rowCount, result, messages) => {
      expect(
        await run(
          "datasets",
          "loads",
          withDataset({ rowCount }),
          answerAll(result),
        ),
      ).toEqual(onDatasets(...messages));
    });

    it("loads: doesn't fetch a relative file and says it couldn't check it", async () => {
      const fetchUrl = stubFetch();
      expect(
        severityAndMessage(
          await run(
            "datasets",
            "loads",
            withDataset({ fileUrl: "/uploads/d.csv" }),
            fetchUrl,
          ),
        ),
      ).toEqual([
        [
          "unknown",
          'The dataset "checkouts.csv" has a relative address (/uploads/d.csv), so it wasn\'t checked.',
        ],
      ]);
      expect(fetchUrl).not.toHaveBeenCalled();
    });

    it.each<[string, ScanBlock[], string[]]>([
      [
        "named in a notebook",
        [
          codeBlock({
            variant: "notebook",
            code: 'pd.read_csv("checkouts.csv")',
          }),
        ],
        [],
      ],
      [
        "not named anywhere",
        [codeBlock()],
        ['No code block uses "checkouts.csv".'],
      ],
      [
        "named only in a Sandpack file",
        [sandpack("react", { "/App.js": 'fetch("checkouts.csv")' })],
        ['No code block uses "checkouts.csv".'],
      ],
    ])("used: %s", async (_label, blocks, messages) => {
      expect(await run("datasets", "used", withDataset({}, blocks))).toEqual(
        onDatasets(...messages),
      );
    });
  });

  it.each<[string, string, ScanDocument, string]>([
    ["images", "loads", withBlock(imageAt(CDN_PNG)), "This image"],
    [
      "videos",
      "exists",
      withBlock(video("https://youtu.be/abc")),
      "This video",
    ],
    [
      "links",
      "answers",
      withBlock(linked("guide", "https://x.org/")),
      'The link "guide"',
    ],
    ["datasets", "loads", withDataset(), 'The dataset "checkouts.csv"'],
  ])(
    "%s / %s: a timeout is couldn't check, never needs attention",
    async (checkId, ruleId, doc, what) => {
      expect(
        severityAndMessage(
          await run(checkId, ruleId, doc, answerAll(unchecked("timeout"))),
        ),
      ).toEqual([["unknown", `${what} didn't answer within 5 s.`]]);
    },
  );
});

describe("MEDIA_CHECKS", () => {
  it("lists the 9 checks in the prototype's order, network checks marked", () => {
    expect(MEDIA_CHECKS.map((c) => [c.id, c.group, !!c.network])).toEqual([
      ["accessibility", "media", false],
      ["images", "media", true],
      ["videos", "media", true],
      ["links", "media", true],
      ["quizzes", "media", false],
      ["open-ended", "media", false],
      ["code", "media", false],
      ["datasets", "media", true],
      ["fun-fact", "media", false],
    ]);
  });

  // The prototype's results, confirmed by running the prototype itself
  it("gives the prototype's media results on the sample droplet", async () => {
    const fetchUrl = stubFetch(sampleWeb);
    const results = await Promise.all(
      MEDIA_CHECKS.map(async (check) => ({
        id: check.id,
        rules: await Promise.all(
          check.rules.map(async (rule) => ({
            id: rule.id,
            flags: await rule.run(sampleScanDocument, fetchUrl),
          })),
        ),
      })),
    );

    expect(
      results.flatMap((check) =>
        check.rules.flatMap((rule) =>
          rule.flags.map((f) => [
            `${check.id} / ${rule.id}`,
            f.partId,
            f.blockId,
            f.severity,
            f.message,
          ]),
        ),
      ),
    ).toEqual([
      [
        "accessibility / image-captions",
        "102",
        "l2-img",
        "warn",
        'This image has no caption, so screen readers only hear "Image".',
      ],
      [
        "accessibility / link-text",
        "104",
        "l4-p4",
        "warn",
        'The link text "click here" doesn\'t say where it goes.',
      ],
      [
        "links / answers",
        "102",
        "l2-p3",
        "warn",
        'The link "guide to handling missing values in pandas" doesn\'t load (404 Not Found).',
      ],
      [
        "links / answers",
        "104",
        "l4-p5",
        "warn",
        'The link "internal dashboard" wasn\'t fetched: private or internal address.',
      ],
      [
        "links / https",
        "104",
        "l4-p5",
        "warn",
        'The link "internal dashboard" uses http, not https.',
      ],
    ]);

    // The prototype's statusOf; ODY-790's runChecks replaces it
    const worst = (statuses: string[]) =>
      statuses.includes("warn")
        ? "warn"
        : statuses.includes("unknown")
          ? "unknown"
          : "pass";
    expect(
      Object.fromEntries(
        results.map((check) => [
          check.id,
          worst(
            check.rules.map((rule) => worst(rule.flags.map((f) => f.severity))),
          ),
        ]),
      ),
    ).toEqual({
      accessibility: "warn",
      images: "pass",
      videos: "pass",
      links: "warn",
      quizzes: "pass",
      "open-ended": "pass",
      code: "pass",
      datasets: "pass",
      "fun-fact": "pass",
    });
  });
});
