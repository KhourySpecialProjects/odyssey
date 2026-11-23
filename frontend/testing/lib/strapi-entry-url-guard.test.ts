import fs from "fs";
import path from "path";

// Strapi v5 single-entry routes (/api/<collection>/:id) only accept a
// documentId (ODY-601). Build those URLs with strapiEntryUrl(), or pass
// `/<collection>/${await resolveDocumentId(...)}` to fetchAPI(). This test
// flags the forms that interpolate or concatenate a raw, probably numeric, id.
//
// lib/requests/lesson-lock.ts is not exempt because it does not match either
// rule: its routes look like `${STRAPI_API_URL}/lessons/${id}/lock`. They are
// numeric on purpose until ODY-606.

const SOURCE_DIRS = [
  "lib",
  "app",
  "components",
  "providers",
  "stores",
  "scripts",
];
const EXCLUDED_DIRS = new Set(["node_modules", ".next"]);
const EXEMPT_FILES = new Set([path.join("lib", "strapi-document-id.ts")]);

// Keep in sync with StrapiCollection in lib/strapi-document-id.ts (a type only,
// so it cannot be imported as a value).
const COLLECTIONS = [
  "access-requests",
  "announcements",
  "authorized-users",
  "authorized-user-roles",
  "creation-requests",
  "datasets",
  "droplets",
  "droplet-lessons",
  "due-dates",
  "enrollments",
  "friendships",
  "galleries",
  "groups",
  "highlights",
  "lessons",
  "notes",
  "playlists",
  "reports",
  "tags",
  "voyages",
  "voyage-enrollments",
  "voyage-nodes",
  "voyage-node-completions",
].join("|");

// Rule 1: `/api/<collection>/${...}` or `/api/<collection>/" + ...`, anywhere.
const RULE_1 = new RegExp(`/api/(?:${COLLECTIONS})/(?:\\$\\{|["']\\s*\\+)`);

// Rule 2: a template literal that starts `/<collection>/${...}` (the fetchAPI
// path form), or the concatenation form `"/<collection>/" + id`. Only checked
// in lib/**, app/api/** and scripts/**: page links such as `/voyages/${slug}`
// live in components and app pages.
const RULE_2 = new RegExp(
  `\`/(?:${COLLECTIONS})/\\$\\{|["']/(?:${COLLECTIONS})/["']\\s*\\+`,
);

// Interpolations that are already a documentId.
const ALREADY_DOCUMENT_ID = [
  /^\$\{await resolveDocumentId\(/,
  /^\$\{[\w.?]*(?:documentId|DocumentId|DocId|docId)\}/,
];

const RULE_2_DIRS = [
  path.join("lib") + path.sep,
  path.join("app", "api") + path.sep,
  path.join("scripts") + path.sep,
];

export type Offender = { line: number; text: string };

/** Finds raw-id Strapi single-entry URLs in `source`. `rel` is relative to frontend/. */
export function scanSource(source: string, rel: string): Offender[] {
  const rule2Applies = RULE_2_DIRS.some((dir) => rel.startsWith(dir));
  const offenders: Offender[] = [];

  source.split("\n").forEach((text, index) => {
    const matches = [
      RULE_1.exec(text),
      rule2Applies ? RULE_2.exec(text) : null,
    ].filter((m): m is RegExpExecArray => m !== null);

    for (const match of matches) {
      // Look at what is interpolated right after the matched prefix.
      const interpolation = text.slice(match.index + match[0].length - 2);
      const isDocumentId = ALREADY_DOCUMENT_ID.some((ok) =>
        ok.test(interpolation),
      );
      if (!isDocumentId) {
        offenders.push({ line: index + 1, text: text.trim() });
        break;
      }
    }
  });

  return offenders;
}

function findSourceFiles(root: string): string[] {
  const results: string[] = [];
  for (const top of SOURCE_DIRS) {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { recursive: true }) as string[]) {
      const rel = path.join(top, entry);
      if (rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg))) continue;
      if (!/\.(ts|tsx)$/.test(entry) || /\.(test|spec)\.tsx?$/.test(entry))
        continue;
      if (EXEMPT_FILES.has(rel)) continue;
      results.push(rel);
    }
  }
  return results.sort();
}

describe("scanSource", () => {
  const lib = path.join("lib", "requests", "x.ts");

  it("flags /api/<collection>/${id} in a template literal", () => {
    const src = "const url = `${BASE}/api/droplets/${id}`;";
    expect(scanSource(src, lib)).toEqual([{ line: 1, text: src }]);
  });

  it("flags /api/<collection>/ concatenated with an id", () => {
    const src = 'const url = BASE + "/api/droplets/" + id;';
    expect(scanSource(src, lib)).toHaveLength(1);
  });

  it("flags the fetchAPI path form in lib and app/api", () => {
    const src = "await fetchAPI(`/droplets/${id}`);";
    expect(scanSource(src, lib)).toHaveLength(1);
    expect(
      scanSource(src, path.join("app", "api", "x", "route.ts")),
    ).toHaveLength(1);
  });

  it("flags the concatenation form of the fetchAPI path in lib, app/api and scripts", () => {
    const src = 'await fetchAPI("/lessons/" + lessonId);';
    expect(scanSource(src, lib)).toHaveLength(1);
    expect(
      scanSource(src, path.join("app", "api", "x", "route.ts")),
    ).toHaveLength(1);
    expect(scanSource(src, path.join("scripts", "x.ts"))).toHaveLength(1);
    expect(scanSource(src, path.join("components", "x.tsx"))).toEqual([]);
  });

  it("flags the fetchAPI path form in scripts", () => {
    const src = "await fetchAPI(`/lessons/${lessonId}`);";
    expect(scanSource(src, path.join("scripts", "x.ts"))).toHaveLength(1);
  });

  it("does not flag the fetchAPI path form in components (page links)", () => {
    const src = "<Link href={`/voyages/${voyage.slug}`} />";
    expect(scanSource(src, path.join("components", "x.tsx"))).toEqual([]);
  });

  it("allows interpolations that are already a documentId", () => {
    const lines = [
      'fetchAPI(`/groups/${await resolveDocumentId("groups", id)}`);',
      "fetchAPI(`/groups/${group.documentId}`);",
      "fetchAPI(`/groups/${groupDocId}`);",
      "const url = `${BASE}/api/groups/${documentId}`;",
    ];
    for (const src of lines) expect(scanSource(src, lib)).toEqual([]);
  });

  it("ignores URLs that are not Strapi collections", () => {
    const src = "fetch(`/api/authorized-user-activities/${activityId}`);";
    expect(scanSource(src, lib)).toEqual([]);
  });

  it("reports 1-based line numbers", () => {
    const src = ["const a = 1;", "fetchAPI(`/tags/${id}`);"].join("\n");
    expect(scanSource(src, lib).map((o) => o.line)).toEqual([2]);
  });
});

describe("Strapi single-entry URLs use a documentId, not a raw id", () => {
  const root = path.resolve(__dirname, "../..");
  const files = findSourceFiles(root);

  it("scans the source tree (guards against matching nothing)", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no raw-id single-entry URLs", () => {
    const failures = files.flatMap((rel) =>
      scanSource(fs.readFileSync(path.join(root, rel), "utf-8"), rel).map(
        (o) => `${rel}:${o.line}  ${o.text}`,
      ),
    );

    expect(failures).toEqual([]);
  });
});
