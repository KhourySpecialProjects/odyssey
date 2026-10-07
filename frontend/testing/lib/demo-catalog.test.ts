import { spawnSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { v5 as uuidv5 } from "uuid";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";
import type { CustomBlockNoteBlock } from "@/types";

/**
 * The demo catalog: droplets written as Markdown in
 * backend/scripts/demo-seed/catalog/ and converted with the app's own
 * Markdown importer, like an author's "Import Markdown". The seed can't run
 * the frontend's TypeScript, so it reads the converted catalog.json.
 *
 * After editing the Markdown, run `npm run demo:catalog` to rebuild
 * catalog.json. This test fails while catalog.json is out of date.
 */
const repoDir = path.join(__dirname, "../../..");
const catalogDir = path.join(repoDir, "backend/scripts/demo-seed/catalog");
const catalogFile = path.join(
  repoDir,
  "backend/scripts/demo-seed/catalog.json",
);
const files = readdirSync(catalogDir)
  .filter((file) => file.endsWith(".md") && file !== "README.md")
  .sort();

// Any fixed namespace works; it only has to stay the same between builds
const BLOCK_ID_NAMESPACE = "8f0e4a32-5d1c-4b7e-9a6f-2c3d1e0b9a87";

/**
 * Block ids from the droplet and each block's position instead of random
 * ones, so rebuilding catalog.json only changes what the Markdown changed.
 */
function withStableIds(blocks: CustomBlockNoteBlock[], droplet: string) {
  let next = 0;
  const visit = (block: CustomBlockNoteBlock): CustomBlockNoteBlock => ({
    ...block,
    id: uuidv5(`${droplet}/${next++}`, BLOCK_ID_NAMESPACE),
    children: (block.children ?? []).map(visit),
  });
  return blocks.map(visit);
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const plainText = (content: unknown) =>
  (content as { text?: string }[]).map((item) => item.text ?? "").join("");

/** A droplet spec for world.js's createDroplet, from one Markdown file. */
function buildDroplet(file: string) {
  const source = readFileSync(path.join(catalogDir, file), "utf8");
  const [, frontMatter, body] = source.match(
    /^---\n([\s\S]*?)\n---\n([\s\S]*)$/,
  )!;

  const meta: Record<string, string> = {};
  const objectives: string[] = [];
  for (const line of frontMatter.split("\n")) {
    const objective = line.match(/^- (.+)$/);
    if (objective) objectives.push(objective[1].trim());
    const field = line.match(/^(\w+):\s*(.+)$/);
    if (field) meta[field[1]] = field[2].trim();
  }

  // Each "# Title" heading starts a lesson; the page shows the lesson name
  // itself, so the heading isn't kept
  const key = file.replace(/\.md$/, "");
  const lessons: { name: string; blocksV2: CustomBlockNoteBlock[] }[] = [];
  const { blocks } = parseMarkdownToBlockNote(body);
  for (const block of withStableIds(blocks, key)) {
    const props = block.props as { level?: number };
    if (block.type === "heading" && props.level === 1) {
      lessons.push({ name: plainText(block.content), blocksV2: [] });
    } else {
      lessons.at(-1)?.blocksV2.push(block);
    }
  }

  return {
    key,
    name: meta.name,
    description: meta.description,
    overview: `<p>${escapeHtml(meta.overview)}</p>`,
    funFact: meta.funFact,
    authors: list(meta.authors),
    type: meta.type,
    focusArea: meta.focusArea,
    difficulty: meta.difficulty,
    tags: list(meta.tags),
    learningObjectives: objectives,
    status: "published",
    lessons,
  };
}

describe("demo catalog", () => {
  it("follows the importer's Markdown rules (catalog/lint.mjs)", () => {
    const lint = spawnSync(process.execPath, ["lint.mjs", ...files], {
      cwd: catalogDir,
      encoding: "utf8",
    });
    const problems = lint.stdout
      .split("\n")
      .filter((line) => line.startsWith("FAIL") || line.includes(" error "));

    expect(problems).toEqual([]);
    expect(lint.status).toBe(0);
  });

  it("has catalog.json built from the current Markdown (npm run demo:catalog)", () => {
    const built = { droplets: files.map(buildDroplet) };
    if (process.env.UPDATE_DEMO_CATALOG) {
      writeFileSync(catalogFile, `${JSON.stringify(built, null, 2)}\n`);
    }
    const committed: { droplets: { key: string }[] } = JSON.parse(
      readFileSync(catalogFile, "utf8"),
    );
    const committedByKey = new Map(
      committed.droplets.map((droplet) => [droplet.key, droplet]),
    );

    expect(committed.droplets.map((droplet) => droplet.key)).toEqual(
      built.droplets.map((droplet) => droplet.key),
    );
    const outOfDate = built.droplets
      .filter(
        (droplet) =>
          JSON.stringify(droplet) !==
          JSON.stringify(committedByKey.get(droplet.key)),
      )
      .map((droplet) => droplet.key);
    expect(outOfDate).toEqual([]);
  });
});
