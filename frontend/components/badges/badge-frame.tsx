import { useId } from "react";

/** Our own trusted markup: the black tile with its blue edge, and the ribbon behind it. */
export const BADGE_VIEWBOX = "24 24 1152 846";

export function BadgeFrame() {
  // One gradient id per instance: several badges share a page.
  const gradientId = `badge-edge-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={BADGE_VIEWBOX}
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d7597" />
          <stop offset="1" stopColor="#173f52" />
        </linearGradient>
      </defs>
      {/* Ribbon, drawn first so the tile covers its top. */}
      <path
        d="M101,590 H1099 V869 L600,817 L101,869 Z"
        fill="#2d7597"
        stroke="#21546d"
        strokeWidth="3"
      />
      <path
        d="M123,600 V846 L600,794 L1077,846 V600"
        fill="none"
        stroke="#639ab3"
        strokeWidth="2"
      />
      {/* Tile: dark edge, gradient band, highlight, black field, inner rule. */}
      <rect x="24" y="24" width="1152" height="583" rx="24" fill="#112a35" />
      <rect
        x="28"
        y="28"
        width="1144"
        height="575"
        rx="20"
        fill={`url(#${gradientId})`}
      />
      <rect
        x="37"
        y="37"
        width="1126"
        height="557"
        rx="13"
        fill="none"
        stroke="#6297ae"
        strokeWidth="2"
      />
      <rect x="38" y="38" width="1124" height="555" rx="12" fill="#000" />
      <rect
        x="65"
        y="65"
        width="1070"
        height="502"
        rx="6"
        fill="none"
        stroke="#1d4b61"
        strokeWidth="2"
      />
    </svg>
  );
}
