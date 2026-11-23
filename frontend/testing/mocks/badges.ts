/**
 * Safe emblem SVGs for tests and local previews of the badge frame, each
 * picturing what its droplet teaches. Four are 2.2:1 wide (the emblem
 * contract); the last, the book, is square.
 */

const BG = (id: string, top: string, bottom: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
  `<rect width="220" height="100" rx="5" fill="url(#${id})"/>`;

/** Academic Communication & Collaboration: two overlapping speech bubbles and a shared draft */
const COMMUNICATION_1 = BG("bg", "#0E3A5E", "#1F6486");
const COMMUNICATION = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
${COMMUNICATION_1}
<path d="M28 18 H104 Q114 18 114 28 V54 Q114 64 104 64 H52 L38 76 L41 64 H28 Q18 64 18 54 V28 Q18 18 28 18 Z" fill="#5FB4E5" stroke="#2A6E90" stroke-width="1.6"/>
<g fill="#FBF7EE"><rect x="30" y="30" width="62" height="5" rx="2.5"/><rect x="30" y="40" width="72" height="5" rx="2.5"/><rect x="30" y="50" width="44" height="5" rx="2.5"/></g>
<path d="M98 36 H162 Q172 36 172 46 V70 Q172 80 162 80 H150 L153 91 L138 80 H98 Q88 80 88 70 V46 Q88 36 98 36 Z" fill="#F0CF37" stroke="#D9861F" stroke-width="1.6"/>
<path d="M112 58 l 8 8 l 16 -16" stroke="#0C3354" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="146" cy="58" r="3" fill="#0C3354"/><circle cx="156" cy="58" r="3" fill="#0C3354"/>
<path d="M180 22 H200 L208 30 V62 Q208 64 206 64 H180 Q178 64 178 62 V24 Q178 22 180 22 Z" fill="#FBF7EE" stroke="#A9B8C6" stroke-width="1.2"/>
<path d="M200 22 V30 H208" fill="#DDE6EE" stroke="#A9B8C6" stroke-width="1.2"/>
<g stroke="#5FB4E5" stroke-width="2" stroke-linecap="round"><path d="M184 38 H200"/><path d="M184 45 H202"/><path d="M184 52 H195"/></g>
<path d="M196 74 L214 56 L218 60 L200 78 L194 80 Z" fill="#E0483F" stroke="#B8352E" stroke-width="1"/>
</svg>`;

/** AI for Work: Problem Solving with GenAI Tools: a lightbulb wired as a network, beside a magnifying glass and a gear */
const gearPath = (cx: number, cy: number, r: number, teeth: number) => {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * i) / teeth;
    const rr = i % 2 === 0 ? r : r * 0.78;
    d += `${i === 0 ? "M" : "L"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
};
const AI_TOOLS_1 = BG("bg", "#0B2A45", "#22698B");
const AI_TOOLS_2 = gearPath(178, 52, 22, 9);
const AI_TOOLS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
${AI_TOOLS_1}
<g stroke="#F0CF37" stroke-width="2.4" stroke-linecap="round" opacity="0.9"><path d="M110 6 V12"/><path d="M80 16 L84 21"/><path d="M140 16 L136 21"/><path d="M72 40 H78"/><path d="M142 40 H148"/></g>
<path d="M110 16 C 126 16 136 28 136 42 C 136 52 130 57 126 63 V70 H94 V63 C 90 57 84 52 84 42 C 84 28 94 16 110 16 Z" fill="#F0CF37" stroke="#D9861F" stroke-width="1.8"/>
<g stroke="#0C3354" stroke-width="1.8" fill="none" stroke-linecap="round"><path d="M98 36 L110 30 L122 36 L116 50 L104 50 Z"/><path d="M110 30 V44 L104 50 M110 44 L116 50"/></g>
<g fill="#0C3354"><circle cx="98" cy="36" r="3"/><circle cx="110" cy="30" r="3"/><circle cx="122" cy="36" r="3"/><circle cx="104" cy="50" r="3"/><circle cx="116" cy="50" r="3"/><circle cx="110" cy="44" r="2.6"/></g>
<rect x="94" y="70" width="32" height="6" rx="2" fill="#A9DDFB" stroke="#297496" stroke-width="1.2"/>
<rect x="96" y="77" width="28" height="6" rx="2" fill="#A9DDFB" stroke="#297496" stroke-width="1.2"/>
<path d="M102 84 H118 L114 90 H106 Z" fill="#297496"/>
<circle cx="50" cy="44" r="15" fill="#A9DDFB" fill-opacity="0.35" stroke="#FBF7EE" stroke-width="5"/>
<path d="M44 38 Q48 34 54 35" stroke="#FBF7EE" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.9"/>
<path d="M61 55 L78 72" stroke="#FBF7EE" stroke-width="8" stroke-linecap="round"/>
<path d="M66 60 L77 71" stroke="#A9B8C6" stroke-width="3.5" stroke-linecap="round"/>
<path d="${AI_TOOLS_2}" fill="#5FB4E5" stroke="#2A6E90" stroke-width="1.6" stroke-linejoin="round"/>
<circle cx="178" cy="52" r="8" fill="#0E3A5E" stroke="#2A6E90" stroke-width="1.4"/>
</svg>`;

/** AI Primer for Co-op Learning: a work briefcase wearing a graduation cap, with AI sparks and rising steps */
const SPARK = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="${fill}"/>`;
const COOP_AI_1 = BG("bg", "#0C3354", "#2A6E90");
const COOP_AI_2 = SPARK(166, 34, 11, "#F0CF37");
const COOP_AI_3 = SPARK(188, 58, 7, "#5FB4E5");
const COOP_AI_4 = SPARK(160, 72, 5, "#FBF7EE");
const COOP_AI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
${COOP_AI_1}
<g fill="#53D17A" stroke="#2FB35A" stroke-width="1.2"><rect x="18" y="72" width="16" height="14" rx="1.5"/><rect x="36" y="62" width="16" height="24" rx="1.5"/><rect x="54" y="52" width="16" height="34" rx="1.5"/></g>
<path d="M22 64 L40 54 L58 44 L66 40" stroke="#F0CF37" stroke-width="2" fill="none" stroke-dasharray="3 3" stroke-linecap="round"/>
<path d="M98 40 V34 Q98 30 102 30 H118 Q122 30 122 34 V40" stroke="#8A4A18" stroke-width="3.5" fill="none"/>
<rect x="80" y="40" width="60" height="44" rx="6" fill="#ECAC30" stroke="#B8701A" stroke-width="1.8"/>
<path d="M80 58 H140" stroke="#B8701A" stroke-width="1.6"/>
<rect x="104" y="54" width="12" height="9" rx="2" fill="#FBF7EE" stroke="#B8701A" stroke-width="1.2"/>
<path d="M110 8 L138 18 L110 28 L82 18 Z" fill="#0C3354" stroke="#061C30" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M96 23 V30 Q110 36 124 30 V23" fill="#123F63" stroke="#061C30" stroke-width="1.2"/>
<path d="M138 18 V30" stroke="#F0CF37" stroke-width="1.6"/><circle cx="138" cy="32" r="2.6" fill="#F0CF37"/>
${COOP_AI_2}${COOP_AI_3}${COOP_AI_4}
</svg>`;

/** Intro to SQL: two tables joined on a key, their overlap highlighted */
const table = (x: number, header: string) =>
  `<rect x="${x}" y="20" width="62" height="60" rx="4" fill="#FBF7EE" stroke="#A9B8C6" stroke-width="1.2"/>` +
  `<path d="M${x + 4} 20 H${x + 58} Q${x + 62} 20 ${x + 62} 24 V32 H${x} V24 Q${x} 20 ${x + 4} 20 Z" fill="${header}"/>` +
  `<g stroke="#C9D3DC" stroke-width="1"><path d="M${x} 44 H${x + 62}"/><path d="M${x} 56 H${x + 62}"/><path d="M${x} 68 H${x + 62}"/><path d="M${x + 22} 32 V80"/></g>` +
  `<g fill="#5B6B7A"><rect x="${x + 28}" y="37" width="26" height="3" rx="1.5"/><rect x="${x + 28}" y="49" width="20" height="3" rx="1.5"/><rect x="${x + 28}" y="61" width="24" height="3" rx="1.5"/><rect x="${x + 28}" y="73" width="16" height="3" rx="1.5"/></g>`;
const SQL_JOIN_1 = BG("bg", "#0B2A45", "#1F6486");
const SQL_JOIN_2 = table(16, "#297496");
const SQL_JOIN_3 = table(142, "#2A55C2");
const SQL_JOIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
${SQL_JOIN_1}
${SQL_JOIN_2}${SQL_JOIN_3}
<circle cx="26" cy="50" r="4.5" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/><path d="M30 50 H36 V53" stroke="#D9861F" stroke-width="1.6" fill="none"/>
<circle cx="152" cy="50" r="4.5" fill="#F0CF37" stroke="#D9861F" stroke-width="1"/><path d="M156 50 H162 V53" stroke="#D9861F" stroke-width="1.6" fill="none"/>
<path d="M80 50 C 92 50 94 50 98 50" stroke="#F0CF37" stroke-width="2.2" stroke-dasharray="4 3" fill="none"/>
<path d="M122 50 C 128 50 132 50 140 50" stroke="#F0CF37" stroke-width="2.2" stroke-dasharray="4 3" fill="none"/>
<circle cx="104" cy="50" r="15" fill="#5FB4E5" fill-opacity="0.85" stroke="#A9DDFB" stroke-width="1.4"/>
<circle cx="116" cy="50" r="15" fill="#6E98F2" fill-opacity="0.85" stroke="#A9DDFB" stroke-width="1.4"/>
<path d="M110 37.3 A 15 15 0 0 1 110 62.7 A 15 15 0 0 1 110 37.3 Z" fill="#53D17A" stroke="#2FB35A" stroke-width="1"/>
</svg>`;

/** Square sample: an open book with a sprout (learning that grows), shown centred */
const BOOK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="bg" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#2A6E90"/><stop offset="1" stop-color="#0C3354"/></radialGradient></defs>
<circle cx="50" cy="50" r="47" fill="url(#bg)" stroke="#297496" stroke-width="2"/>
<path d="M50 40 C 48 30 50 22 58 16 C 60 24 58 32 50 40 Z" fill="#53D17A" stroke="#2FB35A" stroke-width="1.2"/>
<path d="M50 40 C 50 32 44 26 36 26 C 36 34 42 40 50 40 Z" fill="#53D17A" stroke="#2FB35A" stroke-width="1.2"/>
<path d="M50 40 V50" stroke="#2FB35A" stroke-width="2"/>
<path d="M50 52 C 40 46 28 46 18 50 V78 C 28 74 40 74 50 80 Z" fill="#FBF7EE" stroke="#A9B8C6" stroke-width="1.4"/>
<path d="M50 52 C 60 46 72 46 82 50 V78 C 72 74 60 74 50 80 Z" fill="#F3EEDF" stroke="#A9B8C6" stroke-width="1.4"/>
<g stroke="#5FB4E5" stroke-width="1.6" stroke-linecap="round"><path d="M25 58 Q34 55 43 58"/><path d="M25 65 Q34 62 43 65"/><path d="M57 58 Q66 55 75 58"/><path d="M57 65 Q66 62 75 65"/></g>
</svg>`;

export const SAMPLE_BADGE_EMBLEMS: string[] = [
  COMMUNICATION,
  AI_TOOLS,
  COOP_AI,
  SQL_JOIN,
  BOOK,
];
