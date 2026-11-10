import { RUNNABLE_LANGUAGES } from "@/lib/code-languages";

// Saved with every scan (ODY-788). Change it whenever a rule or a limit below
// changes, so a result from older rules can be told apart.
export const RULES_VERSION = "2026-11-10";

// Every limit and list the scan's rules use, with the prototype's key names.
// Each check's ticket adds its own keys. Never import network.ts here: it's
// server only.
export const CONFIG = {
  maxHeadingWords: 12,
  maxImageBytes: 2 * 1024 * 1024,
  videoHosts: [
    "www.youtube.com",
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "player.vimeo.com",
  ],
  // Odyssey's own media hosts come from these env vars at run time, as in
  // next.config.mjs. Names only.
  mediaHostEnv: ["AWS_CDN_URL", "AWS_S3_BUCKET_URL"],
  codeLanguages: RUNNABLE_LANGUAGES,
  sandpackTemplates: ["vanilla", "react", "react-ts"],
  vagueLinkText: ["here", "click here", "link", "this", "read more"],
  nonProdHosts: [
    /^localhost$/,
    /^127(\.\d+){3}$/,
    /^0\.0\.0\.0$/,
    /^\[::1\]$/,
    // dev/staging only as a subdomain label, so dev.to isn't flagged
    /(^|\.)dev\d*\.[^.]+\.[^.]+/,
    /(^|\.)staging\.[^.]+\.[^.]+/,
  ],
  // structure
  maxBlockWords: 300,
  lessonCount: [2, 8] as readonly [number, number],
  overviewWords: [30, 150] as readonly [number, number],
  descriptionChars: [50, 500] as readonly [number, number],
  minObjectives: 3,
  actionVerbs: [
    "analyze",
    "apply",
    "build",
    "calculate",
    "change",
    "check",
    "choose",
    "clean",
    "compare",
    "convert",
    "count",
    "create",
    "debug",
    "describe",
    "design",
    "evaluate",
    "explain",
    "find",
    "fix",
    "identify",
    "list",
    "load",
    "parse",
    "plot",
    "read",
    "save",
    "summarize",
    "test",
    "use",
    "write",
  ] as readonly string[],
  // content
  // Names a heading may capitalize. Acronyms and words with an inner capital
  // (SQL, JavaScript, iOS) are always allowed.
  headingAllowWords: [
    "I",
    "Python",
    "Excel",
    "React",
    "Swift",
    "Xcode",
    "Java",
    "Jupyter",
    "Git",
    "Linux",
    "Windows",
    "Mac",
    "Node",
    "Google",
    "Apple",
    "Microsoft",
    "English",
    "Odyssey",
    "Khoury",
    "Northeastern",
  ] as readonly string[],
  // Words that are correct twice in a row ("He said that that was fine")
  doubledWordsAllow: ["that", "had"] as readonly string[],
  // Short words a heading may write either way, so they fit sentence case and
  // Title Case alike ("Data Science for Beginners", "Lists vs Tuples")
  headingShortWords: [
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "of",
    "on",
    "in",
    "to",
    "at",
    "by",
    "with",
    "as",
    "vs",
    "vs.",
  ] as readonly string[],
  maxAvgSentenceWords: 25,
  maxParagraphSentences: 5,
  maxLessonNameChars: 60,
  inclusiveTerms: {
    whitelist: "allowlist",
    blacklist: "blocklist",
    "master/slave": "primary/replica",
    guys: "everyone",
    "sanity check": "quick check",
  } as Readonly<Record<string, string>>,
  // Odyssey's tech word list: words the en_US dictionary doesn't know.
  // Lowercase; acronyms and camelCase names are skipped without it.
  techWords: `
    api apis app apps astype async auth backend bool boolean booleans br bytecode cli
    codebase config configs csv dataframe dataframes dataset datasets datetime debugger
    dev devs df dict dicts div dropdown dropdowns dtype dtypes enum enums frontend getter getters
    github gitignore hashmap href html http https ide ides iloc img init instantiation ipynb isna
    javascript jpeg jpg js json jsx jupyter kotlin localhost macos matplotlib
    callout heatmap lifecycle lookups loopback quartiles routable viewport
    loc md middleware modularity monospaced namespace namespaces npm nullable nullish numpy
    pandas param params png programmatically pseudocode py pytorch readme
    refactor refactored refactoring regex repo repos resizable reusability
    runtime scalable scikit seaborn setter setters sklearn src stdin stdout str
    struct structs subclass subclasses subcomponent subcomponents subview
    subviews svg swiftui textarea tooltip tooltips ts tsx tuple tuples txt
    typescript uncompress url urls username usernames webpage xcassets xcode
    yaml
  `
    .trim()
    .split(/\s+/) as readonly string[],
  // Words obscenity flags that aren't swears
  swearAllowWords: [
    "cockpit",
    "cumin",
    "dickey",
    "dickinson",
    "pussycat",
    "shiitake",
  ] as readonly string[],
} as const;
