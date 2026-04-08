"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { VoyageIsland } from "./voyage-island";
import { VoyageBoat } from "./voyage-boat";

interface PlaylistEntry {
  id: number;
  name: string;
  slug: string;
  dropletCount: number;
  orderIndex: number;
}

interface VoyageMapProps {
  playlists: PlaylistEntry[];
  showOceanBackground?: boolean;
}

interface IslandPosition {
  x: number;
  y: number;
  playlist: PlaylistEntry;
}

export const OCEAN_GRADIENT =
  "linear-gradient(180deg, #1a6fb5 0%, #1b7ec7 30%, #2196d4 60%, #27a8e0 100%)";

const ISLAND_SIZE = 90;
const VERTICAL_SPACING = 160;
const PADDING_Y = 80;

/**
 * Lay islands out in an S-curve: odd rows go left→right, even rows right→left.
 * The horizontal position oscillates using a sine wave so the path curves
 * naturally instead of zig-zagging.
 */
function computeSCurve(
  playlists: PlaylistEntry[],
  containerWidth: number,
): { positions: IslandPosition[]; totalHeight: number } {
  if (playlists.length === 0 || containerWidth <= 0) {
    return { positions: [], totalHeight: 400 };
  }

  const sorted = [...playlists].sort((a, b) => a.orderIndex - b.orderIndex);
  const marginX = Math.max(ISLAND_SIZE, containerWidth * 0.12);
  const amplitude = (containerWidth - marginX * 2) / 2;
  const centerX = containerWidth / 2;

  const positions: IslandPosition[] = sorted.map((playlist, i) => {
    const t = sorted.length > 1 ? i / (sorted.length - 1) : 0.5;
    // Alternate sides: first island left, then right, then left...
    const adjustedX =
      sorted.length === 1
        ? centerX
        : centerX +
          amplitude * Math.cos(Math.PI * i + Math.PI) * (0.6 + 0.4 * t);
    const y = PADDING_Y + i * VERTICAL_SPACING;

    return { x: adjustedX, y, playlist };
  });

  const totalHeight =
    PADDING_Y * 2 + (sorted.length - 1) * VERTICAL_SPACING + ISLAND_SIZE;

  return { positions, totalHeight };
}

/** Build a smooth SVG cubic bezier path through all island positions */
function buildRoutePath(positions: { x: number; y: number }[]): string {
  if (positions.length < 2) return "";
  const parts: string[] = [`M ${positions[0].x} ${positions[0].y}`];

  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i];
    const to = positions[i + 1];
    const dy = (to.y - from.y) * 0.45;
    parts.push(
      `C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`,
    );
  }

  return parts.join(" ");
}

/** Scattered wave marks for the ocean */
const WAVE_POSITIONS: [number, number][] = [
  [0.06, 0.08],
  [0.88, 0.05],
  [0.14, 0.22],
  [0.78, 0.18],
  [0.92, 0.32],
  [0.08, 0.42],
  [0.55, 0.12],
  [0.35, 0.35],
  [0.72, 0.48],
  [0.18, 0.58],
  [0.85, 0.62],
  [0.42, 0.55],
  [0.62, 0.72],
  [0.05, 0.78],
  [0.9, 0.85],
  [0.28, 0.82],
  [0.5, 0.92],
  [0.75, 0.95],
];

function WaveMark({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g opacity={0.25}>
      <path
        d={`M ${cx - 8} ${cy} Q ${cx - 4} ${cy - 4} ${cx} ${cy} Q ${cx + 4} ${cy + 4} ${cx + 8} ${cy}`}
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${cx - 6} ${cy + 5} Q ${cx - 2} ${cy + 1} ${cx + 2} ${cy + 5} Q ${cx + 6} ${cy + 9} ${cx + 10} ${cy + 5}`}
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

export function VoyageMap({
  playlists,
  showOceanBackground = false,
}: VoyageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ready = containerWidth > 0;
  const { positions, totalHeight } = useMemo(
    () => computeSCurve(playlists, containerWidth),
    [playlists, containerWidth],
  );
  const routePath = useMemo(
    () => buildRoutePath(positions.map((p) => ({ x: p.x, y: p.y }))),
    [positions],
  );

  // Place boat on the path between island 1 and 2, closer to island 1
  let boatX = containerWidth / 2;
  let boatY = PADDING_Y;
  if (positions.length >= 2) {
    boatX = positions[0].x + (positions[1].x - positions[0].x) * 0.2;
    boatY = positions[0].y + (positions[1].y - positions[0].y) * 0.2;
  } else if (positions.length === 1) {
    boatX = positions[0].x + 50;
    boatY = positions[0].y + 20;
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          minHeight: 400,
          height: ready ? totalHeight : 400,
          ...(showOceanBackground
            ? {
                background: OCEAN_GRADIENT,
              }
            : {}),
        }}
      >
        {ready && (
          <>
            {/* Ocean wave marks */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={containerWidth}
              height={totalHeight}
              viewBox={`0 0 ${containerWidth} ${totalHeight}`}
              aria-hidden="true"
            >
              {WAVE_POSITIONS.map(([px, py], i) => (
                <WaveMark
                  key={i}
                  cx={px * containerWidth}
                  cy={py * totalHeight}
                />
              ))}
            </svg>

            {/* Dashed route line */}
            {routePath && (
              <svg
                className="pointer-events-none absolute inset-0"
                width={containerWidth}
                height={totalHeight}
                viewBox={`0 0 ${containerWidth} ${totalHeight}`}
                aria-hidden="true"
                style={{ zIndex: 2 }}
              >
                <path
                  d={routePath}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="3"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}

            {/* Boat */}
            {playlists.length > 0 && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: boatX - 18,
                  top: boatY - 18,
                  zIndex: 3,
                }}
              >
                <VoyageBoat size={0.28} />
              </div>
            )}

            {/* Islands */}
            {positions.map(({ x, y, playlist }, i) => (
              <div
                key={playlist.id}
                className="absolute"
                style={{
                  left: x - ISLAND_SIZE / 2,
                  top: y - ISLAND_SIZE / 2,
                  width: ISLAND_SIZE,
                  height: ISLAND_SIZE,
                  zIndex: 4,
                }}
              >
                <div className="flex flex-col items-center">
                  {/* Step number */}
                  <div
                    className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow"
                    style={{ backgroundColor: "#2D6A4F", zIndex: 5 }}
                  >
                    {i + 1}
                  </div>
                  <VoyageIsland
                    name={playlist.name}
                    slug={playlist.slug}
                    dropletCount={playlist.dropletCount}
                    size={ISLAND_SIZE}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-full border-2"
            style={{ backgroundColor: "#D8F3DC", borderColor: "#2D6A4F" }}
          />
          <span>Playlist island</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="24"
              y2="4"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
          </svg>
          <span>Learning route</span>
        </div>
        <div className="flex items-center gap-2">
          <VoyageBoat size={0.12} />
          <span>Your voyage</span>
        </div>
      </div>
    </div>
  );
}
