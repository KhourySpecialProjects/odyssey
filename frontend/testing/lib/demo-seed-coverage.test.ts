import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

/**
 * The demo world (backend/scripts/demo-seed) should show every feature, so
 * the demo keeps up as features ship. This runs the seed against a fake
 * database that keeps every write in memory, then checks the result uses
 * every lesson block, every callout type and every value of the enums that
 * change what pages show. When a new one is added to the app, add it to the
 * seed (lesson blocks go in the Block Gallery, gallery.js).
 */
const repoDir = path.join(__dirname, "../../..");
const frontendDir = path.join(repoDir, "frontend");
const read = (file: string) => readFileSync(path.join(repoDir, file), "utf8");

type Data = Record<string, unknown>;
type Block = {
  id?: string;
  type: string;
  props?: Data;
  content?: unknown;
  children?: Block[];
};

/** Stands in for scripts/demo-seed/strapi.js, keeping every write in memory. */
function recordingDb() {
  const rows: { uid: string; id: number; data: Data }[] = [];
  return {
    rows,
    async create(uid: string, data: Data) {
      const row = { uid, id: rows.length + 1, data: { ...data } };
      // Strapi's lifecycles replace the seed's placeholder slugs
      if (row.data.slug === "seed") row.data.slug = `seeded-${row.id}`;
      rows.push(row);
      return { id: row.id, ...row.data };
    },
    async update(uid: string, id: number, data: Data) {
      const row = rows.find((r) => r.uid === uid && r.id === id);
      if (!row)
        throw new Error(`The seed updated ${uid} ${id} before creating it`);
      Object.assign(row.data, data);
      return { id, ...row.data };
    },
  };
}

const db = recordingDb();
const seeded = (type: string) =>
  db.rows.filter((r) => r.uid === `api::${type}.${type}`).map((r) => r.data);

const strapiSchema = (type: string) =>
  JSON.parse(read(`backend/src/api/${type}/content-types/${type}/schema.json`));

/** The quoted strings in a snippet of source code. */
const stringsIn = (source: string) =>
  [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

/** Block types and inline styles the lesson editor has (lib/blocknote/schema.ts). */
function editorSchema() {
  const source = read("frontend/lib/blocknote/schema.ts");
  const section = (pattern: RegExp) => {
    const match = source.match(pattern);
    if (!match) throw new Error(`schema.ts no longer matches ${pattern}`);
    return match[1];
  };
  // BlockNote's own blocks and styles. It only loads as an ES module, which
  // Jest doesn't transform, so ask a plain Node process.
  const blocknote = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "const m = await import('@blocknote/core'); console.log(JSON.stringify([Object.keys(m.defaultBlockSpecs), Object.keys(m.defaultStyleSpecs)]));",
    ],
    { cwd: frontendDir, encoding: "utf8" },
  );
  const [defaultBlocks, defaultStyles]: string[][] = JSON.parse(
    blocknote.stdout,
  );

  const hiddenBlocks = stringsIn(
    section(/blockTypesToHide = new Set\(\[([\s\S]*?)\]\)/),
  );
  const hiddenStyles = stringsIn(
    section(/stylesToHide = new Set\(\[([\s\S]*?)\]\)/),
  );
  // The app's own blocks: the keys after ...filteredBlockSpecs
  const appBlocks = [
    ...section(
      /blockSpecs: \{\s*\.\.\.filteredBlockSpecs,([\s\S]*?)\n {2}\},/,
    ).matchAll(/^\s*"?([\w-]+)"?:/gm),
  ].map((match) => match[1]);

  return {
    blocks: [
      ...defaultBlocks.filter((type) => !hiddenBlocks.includes(type)),
      ...appBlocks,
    ],
    // The schema's latex style isn't here: the latex block takes its name,
    // so the editor has no latex mark and can't open text that uses it.
    styles: defaultStyles.filter((style) => !hiddenStyles.includes(style)),
  };
}

// In the schema, but the editor hides them from its menus, so lessons never
// have them (ITEMS_TO_HIDE and BLOCKED_BLOCK_TYPES in blocknote-editor-client.tsx)
const NOT_IN_EDITOR_MENUS = ["audio", "file", "checkListItem"];

// Enum values nothing in the app sets anymore, so the demo leaves them out.
// droplet status "edit": only RegenerateSlugButton sets it and nothing renders
// that component; review requests use inReview instead.
const UNUSED_VALUES: Record<string, string[]> = { "droplet.status": ["edit"] };

const allBlocks = (blocks: Block[]): Block[] =>
  blocks.flatMap((block) => [block, ...allBlocks(block.children ?? [])]);

/** Inline style names used anywhere in some block content. */
function stylesIn(content: unknown): string[] {
  if (Array.isArray(content)) return content.flatMap(stylesIn);
  if (!content || typeof content !== "object") return [];
  const node = content as Data;
  if (node.type === "text") return Object.keys((node.styles as Data) ?? {});
  return Object.values(node).flatMap(stylesIn);
}

const missing = (expected: unknown[], present: unknown[]) =>
  expected.filter((value) => !present.includes(value));

let editor: ReturnType<typeof editorSchema>;
let lessons: Data[];
let blocksV2: Block[][];

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedWorld } = require(
    path.join(repoDir, "backend/scripts/demo-seed/world.js"),
  );
  await seedWorld(db);
  editor = editorSchema();
  lessons = seeded("lesson");
  blocksV2 = lessons
    .filter((lesson) => lesson.blocksVersion === "v2")
    .map((lesson) => allBlocks((lesson.blocksV2 as Block[]) ?? []));
});

describe("demo seed coverage", () => {
  it("uses every lesson block the editor offers", () => {
    const used = blocksV2.flat().map((block) => block.type);
    expect(editor.blocks).toContain("callout");

    expect(
      missing(
        editor.blocks.filter((type) => !NOT_IN_EDITOR_MENUS.includes(type)),
        used,
      ),
    ).toEqual([]);
  });

  it("uses every callout type", () => {
    const types = stringsIn(
      read("frontend/components/ui/blocknote/blocks/callout-block.tsx").match(
        /calloutType: \{[\s\S]*?values: \[([\s\S]*?)\]/,
      )![1],
    );
    const used = blocksV2
      .flat()
      .filter((block) => block.type === "callout")
      .map((block) => block.props?.calloutType);

    expect(types).toHaveLength(7);
    expect(missing(types, used)).toEqual([]);
  });

  it("uses every block of the classic (v1) lesson format", () => {
    const components: string[] =
      strapiSchema("lesson").attributes.blocks.components;
    const used = lessons.flatMap((lesson) =>
      ((lesson.blocks as Data[]) ?? []).map((block) => block.__component),
    );

    expect(missing(components, used)).toEqual([]);
  });

  it.each([
    ["droplet", "status"],
    ["droplet", "type"],
    ["droplet", "focusArea"],
    ["droplet", "difficulty"],
    ["announcement", "type"],
    ["voyage", "status"],
    ["voyage-node", "claimStatus"],
    ["voyage-node", "nodeType"],
    ["voyage-node", "branchType"],
    ["lesson", "blocksVersion"],
  ])("seeds every %s %s", (type, attribute) => {
    const { enum: values, default: fallback } =
      strapiSchema(type).attributes[attribute];
    const unused = UNUSED_VALUES[`${type}.${attribute}`] ?? [];
    const used = seeded(type).map((row) => row[attribute] ?? fallback);

    // An exemption for a value the schema dropped is stale: remove it
    expect(missing(unused, values)).toEqual([]);
    expect(missing(missing(values, unused), used)).toEqual([]);
  });

  it("seeds droplets in review, sent back with changes, and hidden", () => {
    const droplets = seeded("droplet");

    expect(droplets.some((d) => d.inReview === true)).toBe(true);
    expect(droplets.some((d) => Boolean(d.afterReview))).toBe(true);
    expect(droplets.some((d) => d.isHidden === true)).toBe(true);
  });
});

// Lessons the editor can't open break the demo, so check the seed's content
// follows the editor's rules too.
describe("demo seed lessons open in the editor", () => {
  it("only uses block types the editor has", () => {
    const used = [...new Set(blocksV2.flat().map((block) => block.type))];

    expect(missing(used, editor.blocks)).toEqual([]);
  });

  it("gives every block its own id within a lesson", () => {
    for (const blocks of blocksV2) {
      const ids = blocks.map((block) => block.id);

      expect(ids.every((id) => typeof id === "string" && id)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only uses inline styles the editor has", () => {
    const used = [
      ...new Set(blocksV2.flat().flatMap((block) => stylesIn(block.content))),
    ];

    expect(missing(used, editor.styles)).toEqual([]);
  });
});
