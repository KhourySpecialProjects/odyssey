/**
 * Safe line-icon emblems for tests and local previews of the badge: square,
 * white strokes, transparent background (the black medal face shows through).
 */

const OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">`;

/** Academic Communication & Collaboration: two overlapping speech bubbles */
const CHAT = `${OPEN}
<path d="M18 22 H58 Q66 22 66 30 V48 Q66 56 58 56 H34 L24 65 V56 H18 Q10 56 10 48 V30 Q10 22 18 22 Z" fill="#FFFFFF" fill-opacity="0.16"/>
<path d="M20 34 H54 M20 44 H44"/>
<path d="M44 62 V58 H62 Q72 58 72 48 V38 H82 Q90 38 90 46 V66 Q90 74 82 74 H78 V83 L68 74 H52 Q44 74 44 66 Z"/>
<circle cx="58" cy="66" r="1.6" fill="#FFFFFF" stroke="none"/><circle cx="67" cy="66" r="1.6" fill="#FFFFFF" stroke="none"/><circle cx="76" cy="66" r="1.6" fill="#FFFFFF" stroke="none"/>
</svg>`;

/** AI for Work: Problem Solving with GenAI Tools: a lightbulb wired as a network */
const BULB = `${OPEN}
<path d="M50 12 C 66 12 76 24 76 38 C 76 48 70 54 66 60 Q 64 63 64 68 H36 Q36 63 34 60 C 30 54 24 48 24 38 C 24 24 34 12 50 12 Z" fill="#FFFFFF" fill-opacity="0.16"/>
<path d="M38 76 H62 M41 84 H59 M46 91 H54"/>
<path d="M40 34 L50 28 L60 34 L56 46 H44 Z M50 28 V40 L44 46 M50 40 L56 46" stroke-width="2.6"/>
<g fill="#FFFFFF" stroke="none"><circle cx="40" cy="34" r="3.4"/><circle cx="50" cy="28" r="3.4"/><circle cx="60" cy="34" r="3.4"/><circle cx="44" cy="46" r="3.4"/><circle cx="56" cy="46" r="3.4"/><circle cx="50" cy="40" r="2.8"/></g>
</svg>`;

/** AI Primer for Co-op Learning: a briefcase with a spark */
const BRIEFCASE = `${OPEN}
<path d="M38 30 V24 Q38 20 42 20 H58 Q62 20 62 24 V30"/>
<rect x="14" y="30" width="72" height="50" rx="8" fill="#FFFFFF" fill-opacity="0.16"/>
<path d="M14 52 Q50 62 86 52"/>
<rect x="44" y="50" width="12" height="10" rx="2.5"/>
<path d="M78 8 L80.5 14.5 L87 17 L80.5 19.5 L78 26 L75.5 19.5 L69 17 L75.5 14.5 Z" fill="#FFFFFF" stroke-width="2"/>
</svg>`;

/** Intro to SQL: a database */
const DATABASE = `${OPEN}
<ellipse cx="50" cy="22" rx="30" ry="10" fill="#FFFFFF" fill-opacity="0.16"/>
<path d="M20 22 V76 Q20 86 50 86 Q80 86 80 76 V22"/>
<path d="M20 40 Q20 50 50 50 Q80 50 80 40 M20 58 Q20 68 50 68 Q80 68 80 58"/>
<circle cx="70" cy="34" r="2" fill="#FFFFFF" stroke="none"/><circle cx="70" cy="52" r="2" fill="#FFFFFF" stroke="none"/><circle cx="70" cy="70" r="2" fill="#FFFFFF" stroke="none"/>
</svg>`;

/** A general one: an open book */
const BOOK = `${OPEN}
<path d="M50 28 C 40 20 24 18 10 22 V78 C 24 74 40 76 50 84 Z" fill="#FFFFFF" fill-opacity="0.16"/>
<path d="M50 28 C 60 20 76 18 90 22 V78 C 76 74 60 76 50 84 Z"/>
<path d="M50 28 V84"/>
<path d="M20 36 Q30 34 40 37 M20 48 Q30 46 40 49 M60 37 Q70 34 80 36 M60 49 Q70 46 80 48" stroke-width="2.6"/>
</svg>`;

export const SAMPLE_BADGE_EMBLEMS: string[] = [
  CHAT,
  BULB,
  BRIEFCASE,
  DATABASE,
  BOOK,
];
