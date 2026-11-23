/** Our own trusted markup: the rosette seal, its black medal face and the ribbon tail behind it. */
export const BADGE_VIEWBOX = "34 18 712 882";

const CX = 390;
const CY = 375;
const POINTS = 24;
const OUTER_RADIUS = 352;
const INNER_RADIUS = 330;

/** A sawtooth star with a point at the top (first vertex at -90 degrees). */
const SEAL_POINTS = Array.from({ length: POINTS * 2 }, (_, i) => {
  const radius = i % 2 === 0 ? OUTER_RADIUS : INNER_RADIUS;
  const angle = (-90 + (i * 180) / POINTS) * (Math.PI / 180);
  return `${(CX + radius * Math.cos(angle)).toFixed(1)},${(CY + radius * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

export function BadgeFrame() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={BADGE_VIEWBOX}
      className="absolute inset-0 h-full w-full"
    >
      {/* Ribbon tail, drawn first so the seal covers its top. */}
      <path
        data-part="ribbon"
        d="M135 560 H645 V893 L390 858 L135 893 Z"
        fill="#2d7597"
        stroke="#1e5770"
        strokeWidth="3"
      />
      <path
        data-part="ribbon-line"
        d="M152 600 V875 L390 841 L628 875 V600"
        fill="none"
        stroke="#7fb0c8"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
      <polygon
        data-part="seal"
        points={SEAL_POINTS}
        fill="#2d7597"
        stroke="#1e5770"
        strokeWidth="2.5"
        strokeLinejoin="miter"
      />
      <circle
        data-part="ring"
        cx={CX}
        cy={CY}
        r="310"
        fill="none"
        stroke="#dbe9f1"
        strokeWidth="5"
      />
      <circle
        data-part="face"
        cx={CX}
        cy={CY}
        r="287"
        fill="#000"
        stroke="#9cc4d6"
        strokeWidth="1.5"
      />
    </svg>
  );
}
