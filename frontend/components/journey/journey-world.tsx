import {
  DRAFT_BUOYS,
  DRAFT_FRAME,
  DRAFT_ISLAND,
  DROPLET_ISLETS,
  HARBOR_LAND,
  LESSON_BUOYS,
  PLAYLIST_CHAINS,
  VOYAGE_BRANCH,
  VOYAGE_ISLANDS,
  VOYAGE_ROUTE,
  WORLD,
  type Islet,
} from "./journey-config";
import { blobPath, seeded, type Route } from "./journey-math";

// The illustrated map the camera flies over. Static markup only: anything
// that animates carries a `data-j` hook the journey's renderer writes to.

const HAIRLINE = { vectorEffect: "non-scaling-stroke" as const };

const SHALLOWS = "fill-[#d9eff7] dark:fill-[#10304a]";
const SAND = "fill-[#F4E5C0] dark:fill-[#34464a]";
const LAND = "fill-[#a9d6bf] dark:fill-[#1d4b49]";
const HIGHLAND = "fill-[#8fc7ab] dark:fill-[#255a55]";
const CONTOUR =
  "fill-none stroke-[#297496]/20 dark:stroke-[#5FB4E5]/20 [stroke-width:1]";
const INK = "fill-[#297496] dark:fill-[#5FB4E5]";
const INK_STROKE = "stroke-[#297496] dark:stroke-[#5FB4E5]";

function scaleAbout(x: number, y: number, k: number) {
  return `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`;
}

/** An island with shallows, contour rings, a sand beach and green land. */
function Island({
  islet,
  hook,
  contours = 2,
}: {
  islet: Pick<Islet, "x" | "y" | "r" | "seed">;
  hook?: string;
  contours?: number;
}) {
  const { x, y, r, seed } = islet;
  const d = blobPath(x, y, r, seed);
  return (
    <g data-j={hook}>
      <path d={d} transform={scaleAbout(x, y, 1.55)} className={SHALLOWS} />
      {Array.from({ length: contours }, (_, i) => (
        <path
          key={i}
          d={d}
          transform={scaleAbout(x, y, 1.5 + i * 0.32)}
          className={CONTOUR}
          style={HAIRLINE}
        />
      ))}
      <path d={d} className={SAND} />
      <path d={d} transform={scaleAbout(x, y, 0.78)} className={LAND} />
      <path
        d={blobPath(x, y, r * 0.42, seed + 5, 0.2, 8)}
        className={HIGHLAND}
      />
    </g>
  );
}

/** Tabler-style droplet glyph, the product's icon for Droplets. */
function DropMarker({ x, y, size }: { x: number; y: number; size: number }) {
  const h = size;
  const w = size * 0.72;
  return (
    <path
      d={`M${x} ${y - h / 2} C${x + w * 0.2} ${y - h * 0.2} ${x + w / 2} ${y} ${x + w / 2} ${y + h * 0.16} A${w / 2} ${w / 2} 0 1 1 ${x - w / 2} ${y + h * 0.16} C${x - w / 2} ${y} ${x - w * 0.2} ${y - h * 0.2} ${x} ${y - h / 2} Z`}
      className={INK}
      opacity={0.85}
    />
  );
}

function Lock({ x, y, size }: { x: number; y: number; size: number }) {
  const s = size;
  return (
    <g className="fill-slate-400 stroke-slate-400 dark:fill-slate-500 dark:stroke-slate-500">
      <rect
        x={x - s / 2}
        y={y - s * 0.1}
        width={s}
        height={s * 0.75}
        rx={s * 0.12}
      />
      <path
        d={`M${x - s * 0.3} ${y - s * 0.1} v${-s * 0.18} a${s * 0.3} ${s * 0.3} 0 0 1 ${s * 0.6} 0 v${s * 0.18}`}
        fill="none"
        strokeWidth={s * 0.13}
      />
    </g>
  );
}

function Graticule() {
  // Extends past the world so the camera never finds an edge.
  const lines = [];
  for (let x = -1600; x < WORLD.w + 1600; x += 200) {
    lines.push(
      <line key={`x${x}`} x1={x} y1={-1200} x2={x} y2={WORLD.h + 1200} />,
    );
  }
  for (let y = -1200; y < WORLD.h + 1200; y += 200) {
    lines.push(
      <line key={`y${y}`} x1={-1600} y1={y} x2={WORLD.w + 1600} y2={y} />,
    );
  }
  return (
    <g
      className="stroke-[#297496]/[0.07] [stroke-width:1] dark:stroke-[#5FB4E5]/[0.07]"
      style={HAIRLINE}
    >
      {lines}
    </g>
  );
}

const LAND_MASSES = [
  ...DROPLET_ISLETS,
  ...VOYAGE_ISLANDS,
  { ...HARBOR_LAND, r: HARBOR_LAND.r * 1.3 },
  { x: 150, y: 1850, r: 420 },
];

/** Cartographic wave marks, scattered deterministically in open water. */
function WaveMarks() {
  const rand = seeded(2024);
  const marks: string[] = [];
  for (let i = 0; marks.length < 150 && i < 800; i++) {
    const x = 80 + rand() * (WORLD.w - 160);
    const y = 80 + rand() * (WORLD.h - 160);
    const clear = LAND_MASSES.every(
      (m) => Math.hypot(m.x - x, m.y - y) > m.r * 1.9 + 40,
    );
    if (clear)
      marks.push(`M${Math.round(x)} ${Math.round(y)} q9 -7 18 0 t18 0`);
  }
  return (
    <path
      d={marks.join(" ")}
      className="fill-none stroke-[#297496]/25 [stroke-width:1.2] dark:stroke-[#5FB4E5]/20"
      style={HAIRLINE}
      strokeLinecap="round"
    />
  );
}

function Mainland() {
  const shore =
    "M-4200 1100 L-1400 1120 C-900 1130 -400 1170 0 1180 C120 1190 230 1290 280 1420 C320 1520 300 1600 340 1700 C380 1800 330 1900 360 2040 C380 2160 320 2280 350 2400 L360 3200";
  const coast = `${shore} L-4200 3200 Z`;
  return (
    <g>
      <path
        d={shore}
        className="fill-none stroke-[#d9eff7] [stroke-width:90] dark:stroke-[#10304a]"
      />
      <path d={coast} className={SAND} />
      <path d={coast} transform="translate(-26 0)" className={LAND} />
      {[46, 96].map((dx) => (
        <path
          key={dx}
          d={shore}
          transform={`translate(${dx} 0)`}
          className={CONTOUR}
          style={HAIRLINE}
        />
      ))}
      {/* Dock */}
      <path
        d="M318 1652 H418"
        className="stroke-[#7a5b3a] [stroke-width:8] dark:stroke-[#a58a6a]"
        strokeLinecap="round"
      />
      {[336, 362, 388, 412].map((x) => (
        <path
          key={x}
          d={`M${x} 1652 v14`}
          className="stroke-[#7a5b3a] [stroke-width:4] dark:stroke-[#a58a6a]"
        />
      ))}
      {/* Lighthouse */}
      <g transform="translate(262 1560)">
        <circle r={30} className="fill-[#fff7d6]/70 dark:fill-[#fde68a]/15" />
        <path
          d="M-9 36 L-6 -18 H6 L9 36 Z"
          className="fill-white dark:fill-slate-200"
        />
        <path
          d="M-7 4 H7 M-8 20 H8"
          className="stroke-[#297496] [stroke-width:4]"
        />
        <rect x={-8} y={-30} width={16} height={12} rx={2} className={INK} />
      </g>
    </g>
  );
}

function PlaylistChain({
  chain,
  index,
}: {
  chain: (typeof PLAYLIST_CHAINS)[number];
  index: number;
}) {
  const d = chain
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");
  return (
    <g data-j={`chain-${index}`}>
      <path
        d={d}
        className={`fill-none ${INK_STROKE} [stroke-width:1.5]`}
        strokeDasharray="2 6"
        strokeLinecap="round"
        style={HAIRLINE}
        opacity={0.7}
      />
      {chain.map((p, i) => (
        <Island
          key={i}
          islet={{ x: p.x, y: p.y, r: 17, seed: 300 + index * 10 + i }}
          contours={1}
        />
      ))}
    </g>
  );
}

function StepBadge({
  x,
  y,
  n,
  hook,
}: {
  x: number;
  y: number;
  n: number;
  hook: string;
}) {
  return (
    <g data-j={hook} transform={`translate(${x} ${y})`}>
      <circle r={17} className={INK} />
      <text
        textAnchor="middle"
        dy={6}
        className="fill-white text-[17px] font-bold"
      >
        {n}
      </text>
    </g>
  );
}

export function JourneyWorld({ route }: { route: Route }) {
  const voyagePath = VOYAGE_ROUTE.toPath();
  const v2 = VOYAGE_ISLANDS[1];
  const branchPath = `M${v2.x} ${v2.y} Q${v2.x + 90} ${v2.y + 150} ${VOYAGE_BRANCH.x} ${VOYAGE_BRANCH.y}`;
  const draftD = blobPath(
    DRAFT_ISLAND.x,
    DRAFT_ISLAND.y,
    DRAFT_ISLAND.r,
    DRAFT_ISLAND.seed,
  );
  const { x: fx, y: fy, w: fw, h: fh } = DRAFT_FRAME;
  const tick = 22;

  return (
    <>
      <defs>
        <radialGradient id="journey-glow">
          <stop
            offset="0%"
            className="[stop-color:#A0E0EF] dark:[stop-color:#5FB4E5]"
            stopOpacity={0.9}
          />
          <stop
            offset="100%"
            className="[stop-color:#A0E0EF] dark:[stop-color:#5FB4E5]"
            stopOpacity={0}
          />
        </radialGradient>
        <pattern
          id="journey-hatch"
          width={14}
          height={14}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={14}
            className={`${INK_STROKE} [stroke-width:3]`}
            opacity={0.35}
          />
        </pattern>
      </defs>

      <Graticule />
      <WaveMarks />
      <Mainland />

      {/* Explore archipelago: Droplets glow like points of knowledge */}
      <g>
        {DROPLET_ISLETS.map((islet) => (
          <circle
            key={islet.id}
            cx={islet.x}
            cy={islet.y}
            r={islet.r * 2.6}
            fill="url(#journey-glow)"
            className="opacity-60 dark:opacity-30"
          />
        ))}
      </g>
      {PLAYLIST_CHAINS.map((chain, i) => (
        <PlaylistChain key={i} chain={chain} index={i} />
      ))}

      {/* Voyage: a mapped route across islands, with an optional branch */}
      <path
        data-j="voy-line"
        d={voyagePath}
        className={`fill-none ${INK_STROKE}`}
        strokeLinecap="round"
        opacity={0.55}
        strokeDasharray={`${VOYAGE_ROUTE.total} ${VOYAGE_ROUTE.total}`}
        strokeDashoffset={VOYAGE_ROUTE.total}
      />
      <path
        data-j="voy-branch"
        d={branchPath}
        className={`fill-none ${INK_STROKE} [stroke-width:1.5]`}
        strokeDasharray="3 7"
        strokeLinecap="round"
        style={HAIRLINE}
        opacity={0}
      />
      {VOYAGE_ISLANDS.slice(1).map((v) => (
        <Island key={v.id} islet={v} hook={`island-${v.id}`} contours={3} />
      ))}
      <Island islet={VOYAGE_BRANCH} hook="island-vb" contours={2} />
      <circle
        data-j="voy-available"
        cx={v2.x}
        cy={v2.y}
        r={v2.r * 1.75}
        className="fill-none stroke-[#60a5fa] [stroke-width:2]"
        style={HAIRLINE}
        opacity={0}
      />

      {DROPLET_ISLETS.map((islet) => (
        <g key={islet.id} data-j={`islet-${islet.id}`}>
          <Island islet={islet} contours={islet.id === "git" ? 3 : 2} />
          <DropMarker
            x={islet.x}
            y={islet.y - islet.r * 0.1}
            size={islet.r * 0.62}
          />
        </g>
      ))}

      {/* Git Fundamentals: lessons as buoys, and a ring once complete */}
      {LESSON_BUOYS.map((b, i) => (
        <g key={i} data-j={`buoy-${i}`} opacity={0}>
          <circle
            cx={b.x}
            cy={b.y}
            r={8}
            className="fill-white dark:fill-slate-900"
          />
          <circle
            cx={b.x}
            cy={b.y}
            r={8}
            className={`fill-none ${INK_STROKE} [stroke-width:2.5]`}
          />
          <circle
            data-j={`buoy-lit-${i}`}
            cx={b.x}
            cy={b.y}
            r={4.5}
            className="fill-emerald-500"
            opacity={0}
          />
        </g>
      ))}
      <StepBadge x={1330 - 60} y={1325 - 52} n={1} hook="voy-step-1" />
      <g data-j="git-done" opacity={0}>
        <circle
          cx={1330}
          cy={1325}
          r={80}
          className="fill-none stroke-[#22c55e] [stroke-width:2]"
          style={HAIRLINE}
        />
        {/* Completed islands show a check in place of their step number */}
        <g transform="translate(1270 1273)">
          <circle r={17} className="fill-[#22c55e]" />
          <path
            d="M-7 0 L-2 5 L7 -5"
            className="fill-none stroke-white [stroke-width:3.5]"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {VOYAGE_ISLANDS.slice(1).map((v) => (
        <StepBadge
          key={v.id}
          x={v.x + v.r * 0.85}
          y={v.y - v.r * 0.85}
          n={v.step}
          hook={`voy-step-${v.step}`}
        />
      ))}
      {VOYAGE_ISLANDS.slice(2).map((v) => (
        <g key={v.id} data-j={`voy-lock-${v.step}`} opacity={0}>
          <Lock x={v.x + v.r * 0.85} y={v.y - v.r * 0.85 + 44} size={16} />
        </g>
      ))}

      {/* Create: a drafting frame where a new island is sketched */}
      <g data-j="draft-frame" opacity={0}>
        <rect
          x={fx}
          y={fy}
          width={fw}
          height={fh}
          className={`fill-white/40 dark:fill-slate-900/30 ${INK_STROKE} [stroke-width:1]`}
          strokeDasharray="4 6"
          style={HAIRLINE}
          strokeOpacity={0.5}
        />
        <path
          d={`M${fx} ${fy + tick} V${fy} H${fx + tick} M${fx + fw - tick} ${fy} H${fx + fw} V${fy + tick} M${fx + fw} ${fy + fh - tick} V${fy + fh} H${fx + fw - tick} M${fx + tick} ${fy + fh} H${fx} V${fy + fh - tick}`}
          className={`fill-none ${INK_STROKE} [stroke-width:2]`}
          style={HAIRLINE}
        />
      </g>
      <path
        data-j="draft-fill"
        d={draftD}
        fill="url(#journey-hatch)"
        opacity={0}
      />
      <path
        data-j="draft-outline"
        d={draftD}
        className={`fill-none ${INK_STROKE}`}
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="1000 1000"
        strokeDashoffset={1000}
      />
      {DRAFT_BUOYS.map((b, i) => (
        <g key={i} data-j={`draft-buoy-${i}`} opacity={0}>
          <circle
            cx={b.x}
            cy={b.y}
            r={11}
            className="fill-white dark:fill-slate-900"
          />
          <circle
            cx={b.x}
            cy={b.y}
            r={11}
            className={`fill-none ${INK_STROKE} [stroke-width:3]`}
          />
        </g>
      ))}

      {/* Groups: a harbor where members' boats gather */}
      <Island islet={HARBOR_LAND} contours={3} />
      <ellipse
        data-j="harbor-ring"
        cx={3470}
        cy={1150}
        rx={250}
        ry={130}
        className={`fill-[#297496]/[0.04] dark:fill-[#5FB4E5]/[0.05] ${INK_STROKE} [stroke-width:1.5]`}
        strokeDasharray="3 7"
        style={HAIRLINE}
        opacity={0}
      />

      {/* Compass rose */}
      <g
        transform="translate(3690 2090)"
        className="fill-none stroke-[#297496]/40 [stroke-width:1] dark:stroke-[#5FB4E5]/35"
        style={HAIRLINE}
      >
        <circle r={96} style={HAIRLINE} />
        <circle r={78} style={HAIRLINE} />
        <path
          d="M0 -120 L14 -14 L120 0 L14 14 L0 120 L-14 14 L-120 0 L-14 -14 Z"
          className="fill-[#297496]/10 dark:fill-[#5FB4E5]/10"
          style={HAIRLINE}
        />
        <text
          y={-132}
          textAnchor="middle"
          className="fill-[#297496]/60 stroke-none text-[28px] font-semibold dark:fill-[#5FB4E5]/60"
        >
          N
        </text>
      </g>

      {/* The route: dashed course ahead, the line travelled, and the wake */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          data-j={`plan-${i}`}
          className={`fill-none ${INK_STROKE} [stroke-width:2]`}
          strokeDasharray="2 7"
          strokeLinecap="round"
          style={HAIRLINE}
          opacity={0}
        />
      ))}
      <path
        data-j="open-course"
        d="M3900 1330 C4000 1360 4100 1380 4300 1370"
        className={`fill-none ${INK_STROKE} [stroke-width:2]`}
        strokeDasharray="2 7"
        strokeLinecap="round"
        style={HAIRLINE}
        opacity={0}
      />
      <path
        data-j="trail"
        d={route.toPath()}
        className={`fill-none ${INK_STROKE}`}
        strokeLinecap="round"
        strokeDasharray={`${route.total} ${route.total}`}
        strokeDashoffset={route.total}
        opacity={0.7}
      />
      <path
        data-j="wake"
        className="fill-none stroke-white dark:stroke-[#9bd3f0]"
        strokeLinecap="round"
        opacity={0}
      />
    </>
  );
}
