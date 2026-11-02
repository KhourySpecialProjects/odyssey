import { CONFIG } from "@/lib/overview-scan/config";
// Types only: network.ts is server only, and rule tests must not load node:http
import type {
  FetchUrl,
  RefusedReason,
  UncheckedReason,
  UrlCheck,
} from "@/lib/overview-scan/network";
import { dropletPart } from "@/lib/overview-scan/parts";
import { norm, words } from "@/lib/overview-scan/text";
import {
  flag,
  type Check,
  type Flag,
  type ScanBlock,
  type ScanDocument,
  type ScanPart,
} from "@/lib/overview-scan/types";

/**
 * The scan's Media and accessibility column (ODY-793), ported rule for rule
 * from the prototype. Rules only return flags; the runner (ODY-790) turns
 * them into passed, needs attention or couldn't check.
 */

type BlockOf<T extends ScanBlock["type"]> = Extract<ScanBlock, { type: T }>;

/** Every block of the given types, in document order, with its part. */
function blocksOf<T extends ScanBlock["type"]>(
  doc: ScanDocument,
  ...types: T[]
) {
  return doc.parts.flatMap((part) =>
    part.blocks
      .filter((b): b is BlockOf<T> => (types as string[]).includes(b.type))
      .map((block) => ({ part, block })),
  );
}

const blank = (text: string) => !String(text ?? "").trim();
const BARE_URL = /^(https?:\/\/|www\.)/;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Odyssey's own media hosts, read at run time (as in next.config.mjs). */
function odysseyMediaHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  return CONFIG.mediaHostEnv
    .map((name) => hostOf(env[name] ?? ""))
    .filter(Boolean);
}

/**
 * How a URL is treated before any fetch. "relative" covers Odyssey's own pages
 * (/…, #…, ?…) and local /uploads/ files; "mail" is mailto: and tel:.
 */
function classify(url: string): "relative" | "mail" | "data-image" | "fetch" {
  const u = url.trim().toLowerCase();
  if (u.startsWith("data:image/")) return "data-image";
  if (/^(mailto|tel):/.test(u)) return "mail";
  if (/^[/#?]/.test(u)) return "relative";
  return "fetch";
}

/** A fetch result, or a relative file URL that was never fetched. */
type FileCheck = UrlCheck | { kind: "relative"; url: string };

function fetchFile(url: string, fetchUrl: FetchUrl): Promise<FileCheck> {
  const kind = classify(url);
  if (kind === "relative") return Promise.resolve({ kind: "relative", url });
  if (kind === "data-image") {
    // Inline images load by definition; the size is the decoded length
    const [meta, data = ""] = url.split(",");
    return Promise.resolve({
      kind: "loaded",
      finalUrl: url,
      status: 200,
      contentType: meta.slice("data:".length).split(";")[0].toLowerCase(),
      bytes: meta.endsWith(";base64")
        ? Math.floor((data.length * 3) / 4)
        : data.length,
    });
  }
  return fetchUrl(url);
}

/** Every URL at once, so the fetcher's queue stays full; results keep their order. */
const fetchAll = (urls: string[], fetchUrl: FetchUrl) =>
  Promise.all(urls.map((url) => fetchFile(url, fetchUrl)));

const STATUS_TEXT: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  410: "Gone",
  500: "Server Error",
};

const REFUSED_TEXT: Record<RefusedReason, string> = {
  "private-address": "private or internal address",
  "unsupported-scheme": "not a web address",
  "invalid-url": "not a valid web address",
};

// "5 s" is NETWORK_LIMITS.urlTimeoutMs, which can't be imported here
const UNCHECKED_TEXT: Record<UncheckedReason, string> = {
  timeout: "didn't answer within 5 s",
  budget: "wasn't checked before the scan's time ran out",
  "too-many-redirects": "redirects too many times to check",
  "rate-limited": "asked us to slow down (429), so it wasn't checked",
  "network-error": "couldn't be reached",
};

/**
 * The flag for a URL that didn't load, or null when it did. `what` starts the
 * message: "This image", `The link "guide"`. Couldn't-check results are
 * "unknown", never "warn".
 */
function urlFlag(
  part: ScanPart,
  blockId: string,
  what: string,
  result: FileCheck,
): Flag | null {
  switch (result.kind) {
    case "loaded":
      return null;
    case "broken": {
      if (result.status === null)
        return flag(
          part,
          blockId,
          `${what} doesn't load: the site doesn't exist.`,
        );
      const text = STATUS_TEXT[result.status];
      return flag(
        part,
        blockId,
        `${what} doesn't load (${result.status}${text ? ` ${text}` : ""}).`,
      );
    }
    case "refused":
      return flag(
        part,
        blockId,
        `${what} wasn't fetched: ${REFUSED_TEXT[result.reason]}.`,
      );
    case "unchecked":
      return flag(
        part,
        blockId,
        `${what} ${UNCHECKED_TEXT[result.reason]}.`,
        "unknown",
      );
    case "relative":
      return flag(
        part,
        blockId,
        `${what} has a relative address (${result.url}), so it wasn't checked.`,
        "unknown",
      );
  }
}

const imagesOf = (doc: ScanDocument) =>
  blocksOf(doc, "image").filter(({ block }) => block.url);
const videosOf = (doc: ScanDocument) =>
  blocksOf(doc, "video").filter(({ block }) => block.url);

/** The video id from any YouTube URL form, or null for a channel or home page. */
function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.split("/")[1] || null;
  const v = url.searchParams.get("v");
  if (v) return v;
  const [, kind, id] = url.pathname.split("/");
  return ["embed", "shorts", "live", "v"].includes(kind) && id ? id : null;
}

/**
 * What to fetch to see whether a video exists: YouTube's or Vimeo's oEmbed
 * (which answer 401/403 for private videos), otherwise the URL itself. Null
 * for a YouTube URL with no video in it.
 */
function videoTarget(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const host = url.hostname;
  if (host === "youtu.be" || /(^|\.)youtube\.com$/.test(host)) {
    const id = youtubeId(url);
    if (!id) return null;
    const watch = `https://www.youtube.com/watch?v=${id}`;
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`;
  }
  if (/(^|\.)vimeo\.com$/.test(host))
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(raw)}`;
  return raw;
}

/** Every link in every part, then the next steps (as in the prototype). */
function allLinks(doc: ScanDocument) {
  const page = dropletPart(doc);
  return [
    ...doc.parts.flatMap((part) =>
      part.blocks.flatMap((block) =>
        (block.links ?? []).map((link) => ({
          part,
          blockId: block.id,
          ...link,
        })),
      ),
    ),
    ...doc.droplet.nextSteps.map((step) => ({
      part: page,
      blockId: "next-steps",
      text: step.label || step.url,
      url: step.url,
    })),
  ];
}

const accessibility: Check = {
  id: "accessibility",
  group: "media",
  title: "Accessibility",
  description: "Makes the droplet usable with a screen reader.",
  scope: "images, links and headings in every lesson",
  rules: [
    {
      id: "image-captions",
      text: "Every image has a caption. The caption is used as the image's alt text for screen readers",
      run: (doc) =>
        blocksOf(doc, "image")
          .filter(({ block }) => blank(block.caption))
          .map(({ part, block }) =>
            flag(
              part,
              block.id,
              'This image has no caption, so screen readers only hear "Image".',
            ),
          ),
    },
    {
      id: "link-text",
      text: 'Every link\'s text says where it goes: none is "here", "click here", "link", "this" or a bare URL',
      run: (doc) =>
        doc.parts.flatMap((part) =>
          part.blocks.flatMap((block) =>
            (block.links ?? [])
              .filter((link) => {
                const text = norm(link.text);
                return (
                  (CONFIG.vagueLinkText as readonly string[]).includes(text) ||
                  BARE_URL.test(text)
                );
              })
              .map((link) =>
                flag(
                  part,
                  block.id,
                  `The link text "${link.text}" doesn't say where it goes.`,
                ),
              ),
          ),
        ),
    },
    {
      id: "heading-length",
      text: `No heading is too long (over ${CONFIG.maxHeadingWords} words)`,
      run: (doc) =>
        blocksOf(doc, "heading").flatMap(({ part, block }) => {
          const n = words(block.text).length;
          return n > CONFIG.maxHeadingWords
            ? [
                flag(
                  part,
                  block.id,
                  `This heading is ${n} words (limit ${CONFIG.maxHeadingWords}). A sentence made into a heading confuses screen-reader navigation.`,
                ),
              ]
            : [];
        }),
    },
  ],
};

const images: Check = {
  id: "images",
  group: "media",
  title: "Images",
  description: "Every image loads and is a sensible size.",
  scope: "every image in every lesson, fetched through the safe fetcher",
  note: "If a lesson has no images, that's OK.",
  network: true,
  rules: [
    {
      id: "loads",
      text: "The URL loads (HTTP 200) and returns an image",
      run: async (doc, fetchUrl) => {
        const found = imagesOf(doc);
        const results = await fetchAll(
          found.map(({ block }) => block.url),
          fetchUrl,
        );
        return found.flatMap(({ part, block }, i): Flag[] => {
          const r = results[i];
          const problem = urlFlag(part, block.id, "This image", r);
          if (problem) return [problem];
          return r.kind === "loaded" &&
            !String(r.contentType ?? "").startsWith("image/")
            ? [flag(part, block.id, "This URL loads, but it isn't an image.")]
            : [];
        });
      },
    },
    {
      id: "size",
      text: `The file is ${CONFIG.maxImageBytes / 1048576} MB or smaller`,
      // Only a loaded image has a size; the loads rule reports the rest
      run: async (doc, fetchUrl) => {
        const found = imagesOf(doc);
        const results = await fetchAll(
          found.map(({ block }) => block.url),
          fetchUrl,
        );
        return found.flatMap(({ part, block }, i): Flag[] => {
          const r = results[i];
          return r.kind === "loaded" &&
            r.bytes !== null &&
            r.bytes > CONFIG.maxImageBytes
            ? [
                flag(
                  part,
                  block.id,
                  `This image is ${(r.bytes / 1048576).toFixed(1)} MB (limit ${CONFIG.maxImageBytes / 1048576} MB).`,
                ),
              ]
            : [];
        });
      },
    },
  ],
};

const videos: Check = {
  id: "videos",
  group: "media",
  title: "Videos",
  description: "Every video exists and can play inside the lesson.",
  scope: "every video's embed info, fetched through the safe fetcher",
  note: "If a lesson doesn't have a video, that's OK.",
  network: true,
  rules: [
    {
      id: "allowed-host",
      text: "The video is from YouTube, Vimeo or Odyssey's CDN",
      run: (doc) => {
        const allowed: string[] = [
          ...CONFIG.videoHosts,
          ...odysseyMediaHosts(),
        ];
        return videosOf(doc)
          .filter(({ block }) => !allowed.includes(hostOf(block.url)))
          .map(({ part, block }) =>
            flag(
              part,
              block.id,
              `Videos from ${hostOf(block.url) || "this site"} aren't allowed.`,
            ),
          );
      },
    },
    {
      id: "exists",
      text: "The video exists and isn't private",
      // A disallowed host is still fetched, so both problems show at once
      run: async (doc, fetchUrl) => {
        const found = videosOf(doc);
        const results = await Promise.all(
          found.map(({ block }) => {
            const target = videoTarget(block.url);
            return target === null ? null : fetchFile(target, fetchUrl);
          }),
        );
        return found.flatMap(({ part, block }, i): Flag[] => {
          const r = results[i];
          if (r === null)
            return [
              flag(
                part,
                block.id,
                "This video link doesn't point at a YouTube video.",
              ),
            ];
          const problem = urlFlag(part, block.id, "This video", r);
          return problem ? [problem] : [];
        });
      },
    },
  ],
};

const links: Check = {
  id: "links",
  group: "media",
  title: "Links",
  description: "Every link works and points somewhere public.",
  scope:
    "every link in lesson text and next steps, fetched through the safe fetcher",
  note: "If a lesson has no links, that's OK.",
  network: true,
  rules: [
    {
      id: "answers",
      text: "Every link answers within 5 seconds with a 2xx or 3xx status",
      // Odyssey's own pages and mailto:/tel: links aren't fetched
      run: async (doc, fetchUrl) => {
        const found = allLinks(doc).filter((l) => classify(l.url) === "fetch");
        const results = await fetchAll(
          found.map((l) => l.url),
          fetchUrl,
        );
        return found.flatMap((l, i): Flag[] => {
          const problem = urlFlag(
            l.part,
            l.blockId,
            `The link "${l.text}"`,
            results[i],
          );
          return problem ? [problem] : [];
        });
      },
    },
    {
      id: "https",
      text: "Every link uses https",
      // Other schemes are the answers rule's job
      run: (doc) =>
        allLinks(doc)
          .filter((l) => /^http:/i.test(l.url.trim()))
          .map((l) =>
            flag(
              l.part,
              l.blockId,
              `The link "${l.text}" uses http, not https.`,
            ),
          ),
    },
    {
      id: "not-dev",
      text: "No link points at localhost, 127.0.0.1, dev or staging hosts",
      run: (doc) =>
        allLinks(doc).flatMap((l) => {
          const host = hostOf(l.url);
          return CONFIG.nonProdHosts.some((re) => re.test(host))
            ? [
                flag(
                  l.part,
                  l.blockId,
                  `The link "${l.text}" points at ${host}, which students can't reach.`,
                ),
              ]
            : [];
        }),
    },
  ],
};

const quizzes: Check = {
  id: "quizzes",
  group: "media",
  title: "Quizzes",
  description: "Every question can actually be answered.",
  scope: "multiple-choice and true/false questions in every lesson",
  note: "If a lesson doesn't have a quiz, that's OK.",
  rules: [
    {
      id: "question-text",
      text: "Every question has text",
      run: (doc) =>
        blocksOf(doc, "quiz-mc", "quiz-tf")
          .filter(({ block }) => blank(block.question))
          .map(({ part, block }) =>
            flag(part, block.id, "This question has no text."),
          ),
    },
    {
      id: "options",
      text: "Every multiple-choice question has at least 2 options, none blank or repeated, with at least one marked correct",
      run: (doc) =>
        blocksOf(doc, "quiz-mc").flatMap(({ part, block }) => {
          const keys = block.options.map((o) => norm(o.text));
          const problems = [
            keys.length < 2 && "This question has fewer than 2 options.",
            keys.some((k) => !k) && "This question has a blank option.",
            new Set(keys).size !== keys.length &&
              "This question repeats an option.",
            !block.options.some((o) => o.isCorrect) &&
              "No option is marked correct.",
          ];
          return problems
            .filter((p): p is string => !!p)
            .map((message) => flag(part, block.id, message));
        }),
    },
  ],
};

const openEnded: Check = {
  id: "open-ended",
  group: "media",
  title: "Open-ended questions",
  description: "Open questions have what's needed to grade them.",
  scope: "open-ended questions in every lesson",
  rules: [
    {
      id: "question-text",
      text: "Every question has text",
      run: (doc) =>
        blocksOf(doc, "quiz-open")
          .filter(({ block }) => blank(block.question))
          .map(({ part, block }) =>
            flag(part, block.id, "This question has no text."),
          ),
    },
    {
      id: "model-answer",
      text: "Every question has a model answer filled in",
      run: (doc) =>
        blocksOf(doc, "quiz-open")
          .filter(({ block }) => blank(block.correctAnswer))
          .map(({ part, block }) =>
            flag(
              part,
              block.id,
              "This question has no model answer to grade against.",
            ),
          ),
    },
  ],
};

const code: Check = {
  id: "code",
  group: "media",
  title: "Code blocks",
  description: "Every code block has code the runner can handle.",
  scope: "code blocks in every lesson",
  rules: [
    {
      id: "has-code",
      text: "Every code block and notebook block has code, and every Sandpack block has at least one file with content",
      run: (doc) =>
        blocksOf(doc, "code", "sandpack").flatMap(({ part, block }): Flag[] => {
          if (block.type === "sandpack")
            return Object.values(block.files).every(blank)
              ? [
                  flag(
                    part,
                    block.id,
                    "This Sandpack block has no files with code.",
                  ),
                ]
              : [];
          if (!blank(block.code)) return [];
          const kind = block.variant === "notebook" ? "notebook" : "code";
          return [flag(part, block.id, `This ${kind} block is empty.`)];
        }),
    },
    {
      id: "language",
      text: "Every block's language is one the code runner supports",
      // Only what actually runs: display-only blocks may show any language,
      // and notebooks always run Python
      run: (doc) =>
        blocksOf(doc, "code", "sandpack").flatMap(({ part, block }): Flag[] => {
          if (block.type === "sandpack")
            return (CONFIG.sandpackTemplates as readonly string[]).includes(
              block.template,
            )
              ? []
              : [
                  flag(
                    part,
                    block.id,
                    `Sandpack doesn't support the "${block.template}" template.`,
                  ),
                ];
          if (block.variant !== "code" || !block.runnable) return [];
          if (block.language === null)
            return [
              flag(part, block.id, "This code block has no language set."),
            ];
          return CONFIG.codeLanguages.includes(block.language)
            ? []
            : [
                flag(
                  part,
                  block.id,
                  `The code runner doesn't support "${block.language}".`,
                ),
              ];
        }),
    },
  ],
};

const datasets: Check = {
  id: "datasets",
  group: "media",
  title: "Datasets",
  description: "Every attached dataset loads and is used in a lesson.",
  scope: "every attached dataset file, fetched through the safe fetcher",
  network: true,
  rules: [
    {
      id: "loads",
      text: "Every attached dataset's file loads, and it has rows",
      // Uploads don't save rowCount yet, so null only flags an empty file
      run: async (doc, fetchUrl) => {
        const page = dropletPart(doc);
        const results = await fetchAll(
          doc.droplet.datasets.map((ds) => ds.fileUrl),
          fetchUrl,
        );
        return doc.droplet.datasets.flatMap((ds, i): Flag[] => {
          const r = results[i];
          const what = `The dataset "${ds.name}"`;
          const problem = urlFlag(page, "datasets", what, r);
          if (problem) return [problem];
          const empty =
            ds.rowCount === 0 ||
            (ds.rowCount === null && r.kind === "loaded" && r.bytes === 0);
          return empty ? [flag(page, "datasets", `${what} has no rows.`)] : [];
        });
      },
    },
    {
      id: "used",
      text: "Every attached dataset's name appears in at least one code block",
      // Sandpack runs in the browser and can't read datasets
      run: (doc) => {
        const code = blocksOf(doc, "code")
          .map(({ block }) => block.code)
          .join("\n");
        return doc.droplet.datasets
          .filter((ds) => !code.includes(ds.name))
          .map((ds) =>
            flag(
              dropletPart(doc),
              "datasets",
              `No code block uses "${ds.name}".`,
            ),
          );
      },
    },
  ],
};

const funFact: Check = {
  id: "fun-fact",
  group: "media",
  title: "Fun fact",
  description: "The fun fact shown when a student finishes.",
  scope: "the fun fact on the droplet page",
  rules: [
    {
      id: "not-empty",
      text: "The fun fact isn't empty",
      run: (doc) =>
        blank(doc.droplet.funFact)
          ? [flag(dropletPart(doc), "fun-fact", "There's no fun fact.")]
          : [],
    },
  ],
};

// In the prototype's order
export const MEDIA_CHECKS: readonly Check[] = [
  accessibility,
  images,
  videos,
  links,
  quizzes,
  openEnded,
  code,
  datasets,
  funFact,
];
