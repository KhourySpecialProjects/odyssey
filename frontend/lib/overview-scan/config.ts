import { RUNNABLE_LANGUAGES } from "@/lib/code-languages";

// Saved with every scan (ODY-788). Change it whenever a rule or a limit below
// changes, so a result from older rules can be told apart.
export const RULES_VERSION = "2026-11-03";

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
} as const;
