import type { HopResponse } from "@/lib/overview-scan/network";
import type {
  ScanSourceDroplet,
  ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";

/**
 * Seeded droplets for the overview scan's end-to-end check (ODY-796), shaped
 * as Strapi returns them, so a test can build a ScanDocument and a local run
 * can seed Strapi from the same data. Types only: a Playwright seed script
 * outside Jest imports this file.
 *
 * CLEAN passes all 23 checks. PROBLEMS has one deliberate problem per check,
 * and EXPECTED holds the flag each one raises. LIMITS has a relative image
 * (Images can't be checked) and a lesson named "Scan" (a reserved slug).
 * WEB is what each public URL answered when the fixture was written.
 */

export type SeedLesson = ScanSourceLesson & { orderIndex: number };
export type SeedDroplet = { droplet: ScanSourceDroplet; lessons: SeedLesson[] };

type Inline = Record<string, unknown>;
type Block = NonNullable<ScanSourceLesson["blocksV2"]>[number];

export const URLS = {
  smallImage: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg",
  bigImage: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Mona_Lisa.jpg",
  video: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  videoOembed:
    "https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjNQXAC9IVRw&format=json",
  otherVideo: "https://www.dailymotion.com/video/x7tgad0",
  guide: "https://pandas.pydata.org/docs/",
  tutorial: "https://docs.python.org/3/tutorial/",
  answers: "https://www.example.com/",
  answersHttp: "http://www.example.com/",
  missing: "https://www.example.com/ody-796-missing-page",
  metadata: "http://169.254.169.254/",
  dataset:
    "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv",
} as const;

const page = (over: Partial<HopResponse>): HopResponse => ({
  status: 200,
  contentType: "text/html",
  bytes: null,
  location: null,
  ...over,
});

/** Keyed by `new URL(url).href`; a stubbed send answers HEAD and GET alike. */
export const WEB: Record<string, HopResponse> = {
  [URLS.smallImage]: page({ contentType: "image/jpeg", bytes: 9_022 }),
  [URLS.bigImage]: page({ contentType: "image/jpeg", bytes: 3_506_068 }),
  [URLS.videoOembed]: page({ contentType: "application/json" }),
  [URLS.otherVideo]: page({}),
  [URLS.guide]: page({}),
  [URLS.tutorial]: page({ bytes: 37_315 }),
  [URLS.answers]: page({}),
  [URLS.answersHttp]: page({}),
  [URLS.missing]: page({ status: 404 }),
  [URLS.dataset]: page({ contentType: "text/plain", bytes: 9_729 }),
};

// ---- BlockNote blocks ----

const text = (value: string): Inline => ({
  type: "text",
  text: value,
  styles: {},
});
const code = (value: string): Inline => ({
  type: "text",
  text: value,
  styles: { code: true },
});
const link = (href: string, value: string): Inline => ({
  type: "link",
  href,
  content: [text(value)],
});

const block = (
  id: string,
  type: string,
  props: Record<string, unknown>,
  content?: Inline[],
): Block => ({ id, type, props, ...(content && { content }), children: [] });

const h = (id: string, level: number, value: string) =>
  block(id, "heading", { level }, [text(value)]);
const p = (id: string, ...content: (string | Inline)[]) =>
  block(
    id,
    "paragraph",
    {},
    content.map((c) => (typeof c === "string" ? text(c) : c)),
  );
const callout = (id: string, value: string) =>
  block(id, "callout", {}, value ? [text(value)] : []);
const image = (id: string, url: string, caption: string) =>
  block(id, "image", { url, caption });
const video = (id: string, url: string) => block(id, "video", { url });
const multipleChoice = (
  id: string,
  question: string,
  options: { text: string; isCorrect: boolean }[],
) =>
  block(id, "quiz-multiple-choice", {
    question,
    options: JSON.stringify(
      options.map((o, i) => ({ id: String(i + 1), ...o })),
    ),
  });
const openEnded = (id: string, question: string, correctAnswer: string) =>
  block(id, "quiz-open-ended", { question, correctAnswer });
const codeBlock = (id: string, language: string, source: string) =>
  block(id, "code-block", { language, code: source, runnable: true });

const lesson = (
  id: number,
  orderIndex: number,
  name: string,
  blocksV2: Block[],
): SeedLesson => ({ id, name, blocksVersion: "v2", blocksV2, orderIndex });

// ---- CLEAN: passes every check ----

export const CLEAN: SeedDroplet = {
  droplet: {
    id: 1,
    name: "Scan E2E clean",
    overview:
      "<p>This droplet shows how to load a table of data, find the values that are missing and check your work. You will read a file, count the empty cells in each column and decide what to do with them. Each lesson is short and ends with a question.</p>",
    description:
      "Load a table of data, find the missing values and check your work.",
    difficulty: "beginner",
    funFact: "The first spreadsheet program ran on a home computer.",
    learningObjectives: [
      { objective: "Load a table of data from a file" },
      { objective: "Find the missing values in each column" },
      { objective: "Explain how you checked your work" },
    ],
    tags: [{ name: "Data" }],
    prerequisites: [],
    postrequisites: [],
    nextSteps: [{ label: "The Python tutorial", url: URLS.tutorial }],
    datasets: [],
  },
  lessons: [
    lesson(11, 1, "Load the data", [
      h("clean-1-heading", 2, "Load a table"),
      p(
        "clean-1-intro",
        "A table has rows and columns. Each row is one record. You can read a table into a data frame with one line of code.",
      ),
      p(
        "clean-1-guide",
        "For more detail, read ",
        link(URLS.guide, "the pandas user guide"),
        ".",
      ),
      image("clean-1-image", URLS.smallImage, "A sample photo"),
    ]),
    lesson(12, 2, "Find missing values", [
      h("clean-2-heading", 2, "Count the empty cells"),
      p(
        "clean-2-intro",
        "Some cells have no value. Call ",
        code("df.isna()"),
        " to mark them, then add up each column.",
      ),
      video("clean-2-video", URLS.video),
      codeBlock("clean-2-code", "python", "print(df.isna().sum())"),
      multipleChoice("clean-2-quiz", "What does a missing value look like?", [
        { text: "An empty cell", isCorrect: true },
        { text: "A zero", isCorrect: false },
      ]),
    ]),
    lesson(13, 3, "Check your work", [
      h("clean-3-heading", 2, "Look at the totals"),
      p(
        "clean-3-intro",
        "When the counts are right, every column adds up. Compare the totals with the number of rows.",
      ),
      h("clean-3-subheading", 3, "Ask a friend"),
      p(
        "clean-3-friend",
        "Show your steps to a friend and ask them to repeat the count.",
      ),
      openEnded(
        "clean-3-question",
        "How would you check that no value was lost?",
        "Compare the row count before and after.",
      ),
    ]),
  ],
};

// ---- PROBLEMS: one problem per check ----

// 46 sentences of 7 words: 322 words in one block, over the 300 limit
const LONG_PARAGRAPH = Array.from(
  { length: 46 },
  (_, i) => `Step ${i + 1} reads one more row here.`,
).join(" ");

export const PROBLEMS: SeedDroplet = {
  droplet: {
    id: 2,
    name: "Scan E2E problems",
    overview: "<p>A short overview.</p>",
    description: "A short description.",
    difficulty: "beginner",
    funFact: "",
    learningObjectives: [
      { objective: "Explain what a missing value is" },
      { objective: "Write one cleaning step" },
    ],
    tags: [],
    // Strapi mirrors this as a postrequisite of LIMITS, so it mustn't be CLEAN
    prerequisites: [
      { id: 3, name: "Scan E2E limits", status: "draft", isHidden: false },
    ],
    postrequisites: [],
    nextSteps: [{ label: "Further reading", url: URLS.answersHttp }],
    datasets: [{ name: "orders.csv", fileUrl: URLS.dataset }],
  },
  lessons: [
    lesson(21, 1, "Content problems", [
      h("problems-1-heading", 2, "Finding Missing Values"),
      callout("problems-1-callout", ""),
      p("problems-1-spelling", "You will recieve a copy of the data."),
      p(
        "problems-1-long",
        "Open the file. Read the rows. Count the cells. Find the gaps. Fill them in. Save the file.",
      ),
      p("problems-1-terms", "Add the address to the whitelist."),
    ]),
    lesson(22, 2, "Structure problems", [
      h("problems-2-heading", 2, "Tidy the columns"),
      h("problems-2-skip", 4, "Rename the columns"),
      p("problems-2-block", LONG_PARAGRAPH),
    ]),
    lesson(
      23,
      3,
      "Media problems in a lesson whose name runs well past the limit",
      [
        h("problems-3-heading", 2, "Check the media"),
        p(
          "problems-3-vague",
          "To see the data, ",
          link(URLS.answers, "click here"),
          ".",
        ),
        image("problems-3-image", URLS.bigImage, "A large painting"),
        video("problems-3-video", URLS.otherVideo),
        p(
          "problems-3-links",
          "Read ",
          link(URLS.missing, "the old guide"),
          " or ask the ",
          link(URLS.metadata, "metadata server"),
          ".",
        ),
        multipleChoice("problems-3-quiz", "Which value is missing?", [
          { text: "The first", isCorrect: false },
          { text: "The second", isCorrect: false },
        ]),
        openEnded("problems-3-question", "Why do values go missing?", ""),
        codeBlock("problems-3-code", "cobol", "DISPLAY 'HELLO'."),
      ],
    ),
  ],
};

/** The flag each check raises on PROBLEMS, by check id. */
export const EXPECTED: Record<string, string> = {
  style:
    '"Finding Missing Values" capitalizes "Missing". Only the first word should start with a capital.',
  quality: "This callout is empty.",
  spelling: '"recieve" isn\'t in the dictionary or the tech word list.',
  readability: "A paragraph has 6 sentences (limit 5).",
  inclusive: 'Uses "whitelist". Try "allowlist".',
  "lesson-titles": "The name is 62 characters (limit 60).",
  organization: '"Rename the columns" is an H4 right after an H2.',
  granularity: "A text block has 322 words (limit 300).",
  overview: "The Overview is 3 words (aim for 30 to 150).",
  objectives: "There are 2 learning objectives (at least 3).",
  prerequisites: '"Scan E2E limits" is not published.',
  "next-steps":
    'Next step "Further reading" needs a label and an https:// URL.',
  description: "The description is 20 characters (aim for 50 to 500).",
  tags: "The droplet has no tags.",
  accessibility: 'The link text "click here" doesn\'t say where it goes.',
  images: "This image is 3.3 MB (limit 2 MB).",
  videos: "Videos from www.dailymotion.com aren't allowed.",
  links: 'The link "the old guide" doesn\'t load (404 Not Found).',
  quizzes: "No option is marked correct.",
  "open-ended": "This question has no model answer to grade against.",
  code: 'The code runner doesn\'t support "cobol".',
  datasets: 'No code block uses "orders.csv".',
  "fun-fact": "There's no fun fact.",
};

/** The Links flag for the link-local address: refused, so never requested. */
export const SSRF_FLAG =
  'The link "metadata server" wasn\'t fetched: private or internal address.';

// ---- LIMITS: a check that can't run, and a reserved lesson slug ----

export const LIMITS: SeedDroplet = {
  droplet: {
    ...CLEAN.droplet,
    id: 3,
    name: "Scan E2E limits",
  },
  lessons: [
    lesson(31, 1, "Scan", [
      h("limits-1-heading", 2, "A lesson named Scan"),
      p("limits-1-intro", "This lesson's slug is not the scan page."),
    ]),
    lesson(32, 2, "A local image", [
      h("limits-2-heading", 2, "An uploaded image"),
      image("limits-2-image", "/uploads/scan-e2e.png", "An uploaded picture"),
    ]),
  ],
};

/** Images can't be checked on LIMITS: the image has a relative address. */
export const LIMITS_IMAGES_FLAG =
  "This image has a relative address (/uploads/scan-e2e.png), so it wasn't checked.";
