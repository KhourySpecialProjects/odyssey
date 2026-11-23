/**
 * Style guide for generated badge emblems (used in ODY-989's prompt). The
 * format rules mirror the contract enforced by `sanitizeEmblem` in ./emblem.ts.
 */

/** The Odyssey logo's navy, steel and sky, plus the Streak Hoard's gold and gems. */
export const EMBLEM_PALETTE = {
  navy: "#0C3354",
  deep: "#061C30",
  steel: "#297496",
  sky: "#5FB4E5",
  foam: "#A9DDFB",
  cream: "#FBF7EE",
  gold: "#F0CF37",
  amber: "#ECAC30",
  deepAmber: "#D9861F",
  gemBlue: "#6E98F2",
  deepGem: "#2A55C2",
  emerald: "#53D17A",
  deepEmerald: "#2FB35A",
  ruby: "#E0483F",
} as const;

const PALETTE_LIST = Object.entries(EMBLEM_PALETTE)
  .map(([name, hex]) => `${name} ${hex}`)
  .join(", ");

export const EMBLEM_STYLE_GUIDE = `Draw a badge emblem as one SVG scene in the Odyssey world: a voyage-and-treasure setting such as a night or dusk sea, layered waves, ships and sails, lighthouses, maps, compasses, coins, gems and chests.
- Focal motif: use exactly one focal motif that tells the droplet's topic through that world (for example circuits on a sail for AI, coin stacks as database cylinders for SQL).
- Style: flat shapes with 1-2 px outlines in a darker shade of the fill. Linear or radial gradients are allowed for skies.
- Canvas: a full-bleed scene background rect with rx="5" on viewBox="0 0 220 100".
- No text: no words, letters or numbers anywhere, since the ribbon carries the title.
- Palette only: use just these colours: ${PALETTE_LIST}.
- Keep the detail readable when the emblem is shown 112 px wide.
- Format: presentation attributes and gradients only. No <style>, style= attributes, filters, <use>, <image>, links, <foreignObject> or scripts. Stay under 50 KB (aim for under 8 KB). Return one root <svg> that has xmlns="http://www.w3.org/2000/svg".`;
