// Exports the 24 Streak Hoard icons (ODY-919) to public/streaks/day-<day>.svg
// from streak-icons.js, the drawing code published with the Streak Hoard
// artifact (https://claude.ai/artifact/BQBVT1ueefK2avzxBXvoNK). Save that
// file, then from frontend/:
//
//   node scripts/streaks/export-icons.mjs <path to streak-icons.js>
//
// It runs in its own vm context, with a stand-in `window`. The files carry no
// role or label: StreakIcon labels the image where it's used.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const [source] = process.argv.slice(2);
if (!source) {
  console.error(
    "Usage: node scripts/streaks/export-icons.mjs <streak-icons.js>",
  );
  process.exit(1);
}

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(source, "utf8"), sandbox, { timeout: 5000 });
const hoard = sandbox.window.StreakHoard;

const out = path.join(import.meta.dirname, "../../public/streaks");
fs.mkdirSync(out, { recursive: true });
for (const [i, tier] of hoard.TIERS.entries()) {
  const svg = hoard
    .render(i, { uid: `d${tier.day}-` })
    .replace(/ role="img" aria-label="[^"]*"/, "");
  fs.writeFileSync(path.join(out, `day-${tier.day}.svg`), `${svg}\n`);
}
console.log(
  hoard.TIERS.map(
    (t) => `{ day: ${t.day}, name: ${JSON.stringify(t.name)} },`,
  ).join("\n"),
);
