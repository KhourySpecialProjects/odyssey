/**
 * Style guide for generated badge emblems (used in ODY-989's prompt). Emblems
 * picture what the droplet teaches; the Odyssey look comes from the frame, not
 * the emblem. The format rules mirror the contract enforced by `sanitizeEmblem`
 * in ./emblem.ts.
 */

/** Suggested colours: the Odyssey logo's blues plus the Streak Hoard's gold and gems. */
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

export const EMBLEM_STYLE_GUIDE = `Draw a badge emblem as one SVG picture of one key idea from the droplet's content: read its name, learning goals and lesson main points, then pick the idea that best stands for what it teaches. Use objects, diagrams or scenes from the subject itself, such as speech bubbles for communication or two joined tables for SQL. There is no required theme or setting.
- Options: when drawing 3 options, each shows a different key idea from the content.
- Style: bold and simple. Flat shapes with 1-2 px outlines in a darker shade of the fill, gradients allowed, and one clear focal picture. Keep it readable when shown 112 px wide.
- Canvas: a full-bleed background rect with rx="5" on viewBox="0 0 220 100", in colours that read well inside a black frame.
- No text: no words, letters or numbers anywhere, since the ribbon carries the title.
- Colours: prefer these (suggested, not required): ${PALETTE_LIST}.
- Format: presentation attributes and gradients only. No <style>, style= attributes, filters, <use>, <image>, links, <foreignObject> or scripts. Stay under 12 KB (aim for under 6 KB). Return one root <svg> that has xmlns="http://www.w3.org/2000/svg".`;
