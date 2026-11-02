import type { UrlCheck } from "@/lib/overview-scan/network";
import type {
  ScanBlock,
  ScanDocument,
  ScanDroplet,
  ScanPart,
} from "@/lib/overview-scan/types";

/**
 * Overview scan test data (ODY-787). `sampleScanDocument` is the prototype's
 * sample droplet ("Cleaning Data with Python") as a ScanDocument, and
 * `sampleWeb` is what each of its URLs returns. ODY-790, 791, 792 and 796
 * reuse them; add blocks for new checks rather than copying the fixture.
 */

export const TEST_CDN = "https://cdn.odyssey.test";

const dropletPage = (overview: string): ScanPart => ({
  id: "droplet",
  kind: "droplet",
  title: "Droplet page",
  blocks: [{ id: "overview", type: "paragraph", text: overview }],
});

export function lesson(
  blocks: ScanBlock[],
  n = 1,
  name = "A lesson",
): ScanPart {
  return {
    id: String(n),
    kind: "lesson",
    title: `Lesson ${n} · ${name}`,
    blocks,
  };
}

/** A droplet page and one empty lesson; override the droplet or the lessons. */
export function scanDoc({
  droplet,
  lessons = [lesson([])],
}: {
  droplet?: Partial<ScanDroplet>;
  lessons?: ScanPart[];
} = {}): ScanDocument {
  return {
    droplet: { funFact: "A fact.", nextSteps: [], datasets: [], ...droplet },
    parts: [dropletPage("An overview."), ...lessons],
  };
}

// Lesson 3 is deliberately long: each section's paragraphs rotate through its
// sentences so no two paragraphs match (the prototype's rotatingParagraphs).
function rotatingParagraphs(sentences: string[], count: number, per: number) {
  return Array.from({ length: count }, (_, k) =>
    Array.from(
      { length: per },
      (_, j) => sentences[(k + j * 3) % sentences.length],
    ).join(" "),
  );
}

const LESSON_3_SECTIONS: {
  heading: string;
  sentences: string[];
  code?: string;
}[] = [
  {
    heading: "Why types matter",
    sentences: [
      "Every column in a DataFrame has a type, and that type decides which operations pandas will allow on it.",
      "A column of numbers stored as text cannot be added up, because pandas treats each value as a string of characters.",
      "Dates stored as text sort in alphabetical order, so the first of March can land before the twentieth of January.",
      "When a type is wrong, the code often runs without an error and quietly gives you a misleading answer.",
      "The dtypes attribute lists the type of every column, and it is the quickest place to spot a problem.",
      "In the checkout file, the due date, the fine amount and the member level all arrive with the wrong type.",
      "Fixing types early saves time later, because every chart, filter and summary depends on them being right.",
      "In this lesson you will change each of those columns to the type it should have had from the start.",
    ],
  },
  {
    heading: "Change a column's type",
    sentences: [
      "The astype method converts a whole column to a new type in one step and returns the converted column.",
      "You assign the result back to the DataFrame, because astype does not change the original column by itself.",
      "Converting to integers fails if any cell is empty, since a whole number type in pandas cannot hold a missing value.",
      "The nullable Int64 type solves that problem, because it keeps missing cells as missing instead of raising an error.",
      "Converting to float works for clean numbers, but it turns whole numbers like 3 into decimals like 3.0.",
      "Pick the type that matches what the column means, not the type that makes an error go away.",
      "After each conversion, look at dtypes again so you can see that the change really happened.",
      "Small checks like this one catch mistakes while they are still easy to find and fix.",
    ],
    code: 'df["copies"] = df["copies"].astype("Int64")\ndf.dtypes',
  },
  {
    heading: "Parse dates",
    sentences: [
      "The to_datetime function turns text such as 2024-03-01 into a real date that pandas can sort and compare.",
      "Once a column holds dates, you can subtract one from another to find how many days a book was out.",
      "Some rows use a different format, so tell to_datetime the format you expect with the format argument.",
      "Rows that do not match the format can become missing values when the errors argument is set to coerce.",
      "Count the missing dates after parsing, because a sudden jump means the format did not match many rows.",
      "Dates also unlock grouping by month or weekday, which is how the library spots its busiest times.",
      "Keep the original text column until you trust the new one, so you can compare the two side by side.",
      "When the counts look right, drop the text version and keep the parsed date column for the rest of the work.",
    ],
    code: 'df["due_date"] = pd.to_datetime(\n    df["due_date"], format="%Y-%m-%d", errors="coerce"\n)',
  },
  {
    heading: "Work with categories",
    sentences: [
      "The member level column only ever holds a few values: student, staff, faculty and guest.",
      "Storing those repeated words as text wastes memory and lets small typos create new, unwanted groups.",
      "The category type stores each distinct value once and keeps a short code for every row instead.",
      "You can list the allowed values in advance, so anything outside the list becomes a missing value you can find.",
      "Typos and stray spaces, such as staff followed by a space, show up as soon as you compare against the allowed list.",
      "Fix those values with replace or strip before converting, so real members are not lost along the way.",
      "Ordered categories also let you sort levels in a meaningful order rather than alphabetical order.",
      "Use value_counts on the result to confirm that every row landed in one of the expected groups.",
    ],
  },
  {
    heading: "Handle numbers stored as text",
    sentences: [
      "The fine amount column arrived as text because some rows include a dollar sign and others include a comma.",
      "Remove those characters with the str.replace method before you try to convert the column to numbers.",
      "The to_numeric function then converts the cleaned text, and errors set to coerce marks anything left over as missing.",
      "Look at the rows that became missing, because they often point to a pattern you have not handled yet.",
      "A fine written as five dollars in words is a good example of a value that needs a human decision.",
      "Once the column is numeric, you can add up total fines per member or find the largest single fine.",
      "Round money to two decimal places when you display it, but keep the full value while you calculate.",
      "Write down each rule you applied, so anyone who runs the script later understands why the numbers changed.",
    ],
    code: 'df["fine"] = pd.to_numeric(\n    df["fine"].str.replace("[$,]", "", regex=True), errors="coerce"\n)',
  },
  {
    heading: "Check your work",
    sentences: [
      "Look at dtypes one last time and compare the result with the list of types you planned at the start.",
      "Count the missing values again, because some conversions turn bad values into new missing cells.",
      "Spot check a few rows by hand, choosing some from the start, the middle and the end of the file.",
      "Sort by the date column to confirm that the earliest and latest checkouts make sense for the library.",
      "Group by member level and count rows to make sure no level disappeared during the conversion.",
      "Add up the fine column and compare the total with the figure the library reported for the same year.",
      "If any check fails, go back one step, fix the rule and run the checks again from the top.",
      "When every check passes, you have a table with the right types that the next lesson can save and share.",
    ],
  },
];

const python = (id: string, code: string): ScanBlock => ({
  id,
  type: "code",
  variant: "code",
  language: "python",
  code,
  runnable: true,
});

function lesson3Blocks(): ScanBlock[] {
  const blocks: ScanBlock[] = [];
  LESSON_3_SECTIONS.forEach((section, si) => {
    const s = si + 1;
    blocks.push({
      id: `l3-h${s}`,
      type: "heading",
      level: 2,
      text: section.heading,
    });
    rotatingParagraphs(section.sentences, 5, 5).forEach((text, pi) =>
      blocks.push({ id: `l3-s${s}-p${pi + 1}`, type: "paragraph", text }),
    );
    if (section.code) blocks.push(python(`l3-s${s}-code`, section.code));
  });
  blocks.push({
    id: "l3-quiz",
    type: "quiz-mc",
    question: "Which method converts a whole column to a new type?",
    options: [
      { text: "astype", isCorrect: true },
      { text: "head", isCorrect: false },
      { text: "isna", isCorrect: false },
    ],
  });
  return blocks;
}

// Lesson ids look like real Strapi ids, so a rule that confuses a lesson's
// position with its id fails the sample test
const sampleLesson = (
  n: number,
  name: string,
  blocks: ScanBlock[],
): ScanPart => ({
  id: String(100 + n),
  kind: "lesson",
  title: `Lesson ${n} · ${name}`,
  blocks,
});

const YOUTUBE_URL = "https://www.youtube.com/watch?v=pandas-read-csv-demo";

export const sampleScanDocument: ScanDocument = {
  droplet: {
    funFact:
      "The name pandas comes from panel data, a term economists use for data collected over time.",
    nextSteps: [
      {
        label: "pandas user guide",
        url: "https://pandas.pydata.org/docs/user_guide/index.html",
      },
    ],
    datasets: [
      {
        name: "library_checkouts.csv",
        fileUrl: `${TEST_CDN}/datasets/library_checkouts.csv`,
        rowCount: 1200,
      },
    ],
  },
  parts: [
    dropletPage(
      "In this droplet you will take a messy spreadsheet of library checkouts and turn it into clean, reliable data. You will load the file with pandas, find the cells that are missing, fix the columns stored with the wrong type and save a clean copy. By the end you will have a short script you can run again on any similar file.",
    ),
    sampleLesson(1, "Loading a CSV", [
      { id: "l1-h1", type: "heading", level: 2, text: "Meet the data" },
      {
        id: "l1-p1",
        type: "paragraph",
        text: "The library tracks every book checkout in a spreadsheet. Each row is one checkout, with the member, the book, the date it went out and the date it came back. Over the years the file picked up gaps, typos and columns stored in the wrong format.",
      },
      {
        id: "l1-img",
        type: "image",
        url: `${TEST_CDN}/images/checkouts-preview.png`,
        caption:
          "The first rows of library_checkouts.csv, opened in a spreadsheet app",
      },
      {
        id: "l1-h2",
        type: "heading",
        level: 2,
        text: "Open the file with pandas",
      },
      {
        id: "l1-p2",
        type: "paragraph",
        text: "pandas reads a CSV file into a DataFrame, a table you can filter, count and change with code. Run the cell below to load the file and look at the first five rows.",
      },
      python(
        "l1-code",
        'import pandas as pd\n\ndf = pd.read_csv("library_checkouts.csv")\ndf.head()',
      ),
      { id: "l1-video", type: "video", url: YOUTUBE_URL },
      {
        id: "l1-h3",
        type: "heading",
        level: 2,
        text: "Check your understanding",
      },
      {
        id: "l1-quiz",
        type: "quiz-mc",
        question: "What does pd.read_csv return?",
        options: [
          { text: "A DataFrame", isCorrect: true },
          { text: "A list of strings", isCorrect: false },
          { text: "A Python dictionary", isCorrect: false },
        ],
      },
    ]),
    sampleLesson(2, "Finding missing values", [
      {
        id: "l2-h1",
        type: "heading",
        level: 2,
        text: "Why missing values matter",
      },
      {
        id: "l2-p1",
        type: "paragraph",
        text: "A missing value is a cell with nothing in it. pandas shows these cells as NaN. They appear when someone skips a field. They also appear when two files are joined and a row has no match. Many calculations skip them without telling you. Others fail with an error. Either way, you need to know where they are before you trust any result.",
      },
      { id: "l2-h2", type: "heading", level: 2, text: "Count them" },
      {
        id: "l2-p2",
        type: "paragraph",
        text: "The isna method marks every empty cell, and sum adds them up for each column. A column with a high count needs a closer look.",
      },
      python("l2-code", "df.isna().sum()"),
      {
        id: "l2-img",
        type: "image",
        url: `${TEST_CDN}/images/missing-heatmap.png`,
        caption: "",
      },
      {
        id: "l2-p3",
        type: "paragraph",
        text: "This guide to handling missing values in pandas walks through more examples.",
        links: [
          {
            text: "guide to handling missing values in pandas",
            url: "https://blog.example.com/pandas-missing-values",
          },
        ],
      },
      {
        id: "l2-h3",
        type: "heading",
        level: 2,
        text: "Check your understanding",
      },
      {
        id: "l2-quiz",
        type: "quiz-tf",
        question: "df.isna().sum() counts the empty cells in each column.",
        correctAnswer: true,
      },
    ]),
    sampleLesson(3, "Fixing data types", lesson3Blocks()),
    sampleLesson(4, "Saving clean data", [
      { id: "l4-h1", type: "heading", level: 2, text: "Choose a file format" },
      {
        id: "l4-p1",
        type: "paragraph",
        text: "CSV files open almost anywhere, which makes them a good default for sharing a clean table with other people.",
      },
      {
        id: "l4-p2",
        type: "paragraph",
        text: "Parquet files keep column types and take less space, which helps when the next step is more Python code.",
      },
      // A callout in the prototype; a paragraph until ODY-790 adds callouts
      {
        id: "l4-callout",
        type: "paragraph",
        text: "Ask your team which format their tools can read before you pick one.",
      },
      { id: "l4-h2", type: "heading", level: 2, text: "Save the clean table" },
      {
        id: "l4-p3",
        type: "paragraph",
        text: "The to_csv method writes the DataFrame to a file. Set index to False so pandas does not add an extra numbered column.",
      },
      python(
        "l4-code",
        'df.to_csv("library_checkouts_clean.csv", index=False)',
      ),
      {
        id: "l4-p4",
        type: "paragraph",
        text: "To learn more about the options for saving files, click here.",
        links: [
          {
            text: "click here",
            url: "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_csv.html",
          },
        ],
      },
      {
        id: "l4-p5",
        type: "paragraph",
        text: "Upload the finished file to the team's internal dashboard when you are done.",
        links: [
          { text: "internal dashboard", url: "http://10.0.3.17/uploads" },
        ],
      },
      {
        id: "l4-h3",
        type: "heading",
        level: 2,
        text: "Check your understanding",
      },
      {
        id: "l4-quiz",
        type: "quiz-open",
        question: "Why should you set index to False when saving with to_csv?",
        correctAnswer:
          "So pandas does not write the row numbers as an extra column.",
      },
    ]),
  ],
};

const loaded = (
  finalUrl: string,
  contentType: string,
  bytes: number | null = null,
): UrlCheck => ({ kind: "loaded", finalUrl, status: 200, contentType, bytes });

const PREVIEW_PNG = `${TEST_CDN}/images/checkouts-preview.png`;
const HEATMAP_PNG = `${TEST_CDN}/images/missing-heatmap.png`;
const YOUTUBE_OEMBED = `https://www.youtube.com/oembed?url=${encodeURIComponent(YOUTUBE_URL)}&format=json`;
const BLOG = "https://blog.example.com/pandas-missing-values";
const TO_CSV =
  "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_csv.html";
const USER_GUIDE = "https://pandas.pydata.org/docs/user_guide/index.html";
const CHECKOUTS_CSV = `${TEST_CDN}/datasets/library_checkouts.csv`;
const DASHBOARD = "http://10.0.3.17/uploads";

/** What each sample URL returns (the prototype's MOCK_WEB); any other URL loads as HTML. */
export const sampleWeb: Record<string, UrlCheck> = {
  [PREVIEW_PNG]: loaded(PREVIEW_PNG, "image/png", 184320),
  [HEATMAP_PNG]: loaded(HEATMAP_PNG, "image/png", 256000),
  [YOUTUBE_OEMBED]: loaded(YOUTUBE_OEMBED, "application/json"),
  [BLOG]: { kind: "broken", finalUrl: BLOG, status: 404 },
  [TO_CSV]: loaded(TO_CSV, "text/html"),
  [USER_GUIDE]: loaded(USER_GUIDE, "text/html"),
  [CHECKOUTS_CSV]: loaded(CHECKOUTS_CSV, "text/csv", 96000),
  // The real fetcher refuses a private address before any request
  [DASHBOARD]: {
    kind: "refused",
    finalUrl: DASHBOARD,
    reason: "private-address",
  },
};
