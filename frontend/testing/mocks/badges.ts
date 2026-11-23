/**
 * Odyssey-themed safe emblem SVGs for tests and local previews of the badge frame.
 * Four are 2.2:1 wide (the emblem contract); the last, the chest, is square.
 */

const SEA = (top: string, bottom: string) =>
  `<path d="M0 74 Q 13.75 69 27.5 74 T 55 74 T 82.5 74 T 110 74 T 137.5 74 T 165 74 T 192.5 74 T 220 74 V100 H0 Z" fill="${top}"/>` +
  `<path d="M0 84 Q 13.75 79 27.5 84 T 55 84 T 82.5 84 T 110 84 T 137.5 84 T 165 84 T 192.5 84 T 220 84 V100 H0 Z" fill="${bottom}"/>` +
  `<path d="M14 79 q 6 -3 12 0 M70 88 q 6 -3 12 0 M150 78 q 6 -3 12 0 M188 90 q 6 -3 12 0" stroke="#A9DDFB" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7"/>`;

const STARS = (pts: [number, number, number][]) =>
  pts
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FBF7EE"/>`)
    .join("");

const STARS_1 = STARS([
  [18, 16, 1.1],
  [34, 30, 0.8],
  [52, 12, 1],
  [70, 24, 0.7],
  [150, 14, 0.8],
  [196, 40, 0.9],
  [206, 14, 0.7],
  [62, 44, 0.6],
]);
const STARS_2 = STARS([
  [16, 14, 0.9],
  [44, 8, 0.7],
  [182, 10, 0.9],
  [204, 26, 0.7],
  [150, 18, 0.6],
  [70, 18, 0.6],
]);
const STARS_3 = STARS([
  [20, 14, 0.9],
  [46, 24, 0.7],
  [176, 12, 0.8],
  [200, 30, 0.7],
]);

/** AI for Work: the Odyssey sailboat, circuits on the sail, a constellation sky */
const AI_SAILBOAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061C30"/><stop offset="1" stop-color="#1F6486"/></linearGradient>
<linearGradient id="sail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF7EE"/><stop offset="1" stop-color="#DDE9F2"/></linearGradient></defs>
<rect width="220" height="100" rx="5" fill="url(#sky)"/>
${STARS_1}
<path d="M20 22 L38 14 L56 26 L74 18" stroke="#5FB4E5" stroke-width="0.9" fill="none" opacity="0.8"/>
<g fill="#A9DDFB"><circle cx="20" cy="22" r="1.8"/><circle cx="38" cy="14" r="1.8"/><circle cx="56" cy="26" r="1.8"/><circle cx="74" cy="18" r="1.8"/></g>
<circle cx="178" cy="26" r="12" fill="#F0CF37"/><circle cx="183" cy="22" r="11" fill="#0B2A45"/>
${SEA("#297496", "#0C3354")}
<path d="M104 18 V68" stroke="#FBF7EE" stroke-width="2.4" stroke-linecap="round"/>
<path d="M107 20 L107 66 L146 66 Z" fill="url(#sail)"/>
<path d="M101 28 L101 66 L74 66 Z" fill="#5FB4E5"/>
<g stroke="#297496" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M111 36 H119 V46 H128"/><path d="M111 52 H123 V60 H136"/><path d="M119 46 V52"/></g>
<g fill="#297496"><circle cx="128" cy="46" r="2.3"/><circle cx="136" cy="60" r="2.3"/><circle cx="111" cy="36" r="2"/><circle cx="111" cy="52" r="2"/></g>
<circle cx="128" cy="46" r="1" fill="#F0CF37"/>
<path d="M68 68 H150 L139 80 H80 Z" fill="#ECAC30" stroke="#D9861F" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M76 73 H144" stroke="#D9861F" stroke-width="1.2"/>
<path d="M104 12 l 6 3 l -6 3 Z" fill="#E0483F"/>
</svg>`;

/** Academic Communication & Collaboration: a lighthouse signalling two boats */
const LIGHTHOUSE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071F35"/><stop offset="1" stop-color="#22698B"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F0CF37" stop-opacity="0"/><stop offset="1" stop-color="#F0CF37" stop-opacity="0.45"/></linearGradient>
<linearGradient id="beamR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#F0CF37" stop-opacity="0"/><stop offset="1" stop-color="#F0CF37" stop-opacity="0.45"/></linearGradient></defs>
<rect width="220" height="100" rx="5" fill="url(#sky)"/>
${STARS_2}
<path d="M110 30 L6 16 L6 50 Z" fill="url(#beam)"/>
<path d="M110 30 L214 16 L214 50 Z" fill="url(#beamR)"/>
${SEA("#297496", "#0C3354")}
<path d="M78 80 Q 88 64 104 66 Q 110 61 118 66 Q 134 64 142 80 Z" fill="#0C3354" stroke="#082640" stroke-width="1"/>
<path d="M101 72 L105 37 H115 L119 72 Z" fill="#FBF7EE"/>
<path d="M103.9 50 L104.6 44 H115.4 L116.1 50 Z" fill="#E0483F"/>
<path d="M102.6 63 L103.3 57 H116.7 L117.4 63 Z" fill="#E0483F"/>
<rect x="101.5" y="34" width="17" height="3.4" rx="1" fill="#0C3354"/>
<rect x="105" y="25" width="10" height="9" rx="1.2" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/>
<path d="M103 25.5 L110 17 L117 25.5 Z" fill="#E0483F" stroke="#B8352E" stroke-width="0.8" stroke-linejoin="round"/>
<g stroke="#F0CF37" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.9"><path d="M60 58 q -5 -5 0 -10"/><path d="M54 61 q -8 -8 0 -16"/><path d="M160 58 q 5 -5 0 -10"/><path d="M166 61 q 8 -8 0 -16"/></g>
<path d="M30 78 H60 L54 85 H36 Z" fill="#ECAC30" stroke="#D9861F" stroke-width="1.2"/><path d="M45 52 V78" stroke="#FBF7EE" stroke-width="1.6"/><path d="M47 54 L47 76 L62 76 Z" fill="#FBF7EE"/><path d="M45 50 l 5 2.5 l -5 2.5 Z" fill="#53D17A"/>
<path d="M160 78 H190 L184 85 H166 Z" fill="#ECAC30" stroke="#D9861F" stroke-width="1.2"/><path d="M175 52 V78" stroke="#FBF7EE" stroke-width="1.6"/><path d="M173 54 L173 76 L158 76 Z" fill="#5FB4E5"/><path d="M175 50 l -5 2.5 l 5 2.5 Z" fill="#6E98F2"/>
</svg>`;

/** AI Primer for Co-op Learning: a treasure map, a dotted route to the X, a compass */
const TREASURE_MAP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
<defs><linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF7EE"/><stop offset="1" stop-color="#EBDFC3"/></linearGradient>
<linearGradient id="roll" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9861F"/><stop offset="0.5" stop-color="#F0CF37"/><stop offset="1" stop-color="#D9861F"/></linearGradient></defs>
<rect x="10" y="8" width="200" height="84" rx="3" fill="url(#paper)" stroke="#C9B68E" stroke-width="1.2"/>
<path d="M24 20 Q 40 14 58 22 Q 66 34 54 44 Q 40 52 28 42 Q 18 32 24 20 Z" fill="#A9DDFB" opacity="0.8"/>
<path d="M120 58 Q 136 44 160 50 Q 182 54 178 70 Q 170 84 146 80 Q 122 78 120 58 Z" fill="#53D17A" opacity="0.55" stroke="#2FB35A" stroke-width="1"/>
<path d="M150 60 l 3 -9 l 3 9 M146 64 l 4 -7 l 4 7" stroke="#2FB35A" stroke-width="1.2" fill="none"/>
<path d="M40 70 C 52 50 72 46 86 58 S 112 72 126 56 S 150 40 160 44" fill="none" stroke="#E0483F" stroke-width="2.2" stroke-dasharray="4 4" stroke-linecap="round"/>
<path d="M30 66 H48 L44 71 H34 Z" fill="#ECAC30" stroke="#D9861F" stroke-width="1"/><path d="M39 52 V66" stroke="#0C3354" stroke-width="1.2"/><path d="M40.5 53 L40.5 64 L49 64 Z" fill="#297496"/>
<path d="M156 38 L166 48 M166 38 L156 48" stroke="#E0483F" stroke-width="3" stroke-linecap="round"/>
<path d="M178 30 l 2 -6 l 2 6 l 6 2 l -6 2 l -2 6 l -2 -6 l -6 -2 Z" fill="#F0CF37" stroke="#D9861F" stroke-width="0.8"/>
<g transform="translate(78 30)"><circle r="12" fill="#FBF7EE" stroke="#0C3354" stroke-width="1.4"/><path d="M0 -11 L3 0 L0 11 L-3 0 Z" fill="#0C3354"/><path d="M0 -11 L3 0 L-3 0 Z" fill="#E0483F"/><path d="M-11 0 L0 -2.5 L11 0 L0 2.5 Z" fill="#297496" opacity="0.8"/><circle r="1.6" fill="#F0CF37"/></g>
<rect x="4" y="5" width="9" height="90" rx="4.5" fill="url(#roll)" stroke="#B8701A" stroke-width="1"/>
<rect x="207" y="5" width="9" height="90" rx="4.5" fill="url(#roll)" stroke="#B8701A" stroke-width="1"/>
</svg>`;

/** Intro to SQL: an island of gold coin stacks (database cylinders), a flag on top */
const coinStack = (x: number, base: number, coins: number) => {
  let s = "";
  for (let i = 0; i < coins; i++) {
    const y = base - i * 5;
    s += `<rect x="${x - 10}" y="${y - 5}" width="20" height="5" fill="#ECAC30" stroke="#D9861F" stroke-width="0.8"/>`;
  }
  const top = base - coins * 5;
  s += `<ellipse cx="${x}" cy="${top}" rx="10" ry="3" fill="#F0CF37" stroke="#D9861F" stroke-width="0.8"/>`;
  s += `<ellipse cx="${x}" cy="${top}" rx="5" ry="1.4" fill="none" stroke="#D9861F" stroke-width="0.7"/>`;
  return s;
};
const COIN_ISLAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C3354"/><stop offset="1" stop-color="#3C8DB3"/></linearGradient>
<linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DFA2"/><stop offset="1" stop-color="#D9A75A"/></linearGradient></defs>
<rect width="220" height="100" rx="5" fill="url(#sky)"/>
${STARS_3}
<g fill="#FBF7EE" opacity="0.85"><ellipse cx="40" cy="38" rx="14" ry="4"/><ellipse cx="50" cy="35" rx="9" ry="4"/><ellipse cx="178" cy="46" rx="12" ry="3.5"/></g>
${SEA("#297496", "#0C3354")}
<path d="M62 78 Q 110 50 158 78 Z" fill="url(#sand)" stroke="#C48A3E" stroke-width="1"/>
${coinStack(92, 70, 4)}${coinStack(110, 68, 7)}${coinStack(128, 70, 5)}
<path d="M110 33 V14" stroke="#0C3354" stroke-width="1.4"/><path d="M111 14 L124 18 L111 22 Z" fill="#E0483F"/>
<path d="M148 66 Q 150 52 156 46" stroke="#8A5A2B" stroke-width="2" fill="none"/><path d="M156 46 q -10 -2 -14 4 M156 46 q 2 -9 9 -10 M156 46 q 10 -1 13 5" stroke="#2FB35A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M72 54 l 1.5 -4 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 Z" fill="#F0CF37"/>
</svg>`;

/** Square sample: a treasure chest of gems, shown centred in the wide tile */
const TREASURE_CHEST = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#2A6E90"/><stop offset="1" stop-color="#0C3354"/></radialGradient>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C77B30"/><stop offset="1" stop-color="#8A4A18"/></linearGradient></defs>
<circle cx="50" cy="50" r="47" fill="url(#glow)" stroke="#297496" stroke-width="2"/>
<path d="M24 46 Q 24 30 50 30 Q 76 30 76 46 Z" fill="url(#wood)" stroke="#5C2A12" stroke-width="1.4"/>
<path d="M24 46 H76 V74 Q 76 78 72 78 H28 Q 24 78 24 74 Z" fill="url(#wood)" stroke="#5C2A12" stroke-width="1.4"/>
<path d="M34 31 V78 M66 31 V78" stroke="#F0CF37" stroke-width="3.2"/><path d="M24 46 H76" stroke="#F0CF37" stroke-width="3"/>
<rect x="45" y="44" width="10" height="11" rx="2" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/><circle cx="50" cy="49" r="1.6" fill="#5C2A12"/>
<path d="M38 41 l 4 -7 l 4 7 l -4 4 Z" fill="#6E98F2" stroke="#2A55C2" stroke-width="0.8"/>
<path d="M56 41 l 3 -6 l 3 6 l -3 3 Z" fill="#53D17A" stroke="#2FB35A" stroke-width="0.8"/>
<circle cx="31" cy="83" r="4" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/><circle cx="69" cy="84" r="3.4" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/>
<path d="M74 82 l 3 -5 l 3 5 l -3 3 Z" fill="#E0483F" stroke="#B8352E" stroke-width="0.8"/>
<path d="M50 14 l 1.5 -4 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 Z" fill="#F0CF37"/>
</svg>`;

export const SAMPLE_BADGE_EMBLEMS: string[] = [
  LIGHTHOUSE,
  AI_SAILBOAT,
  TREASURE_MAP,
  COIN_ISLAND,
  TREASURE_CHEST,
];
