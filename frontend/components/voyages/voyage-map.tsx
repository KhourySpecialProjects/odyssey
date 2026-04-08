"use client";

import { useRef, useEffect, useState } from "react";
import { VoyageIsland } from "./voyage-island";
import { VoyageBoat } from "./voyage-boat";
import { VoyageWaves } from "./voyage-waves";
import { VoyageRoute } from "./voyage-route";

interface PlaylistEntry {
  id: number;
  name: string;
  slug: string;
  dropletCount: number;
  orderIndex: number;
}

interface VoyageMapProps {
  playlists: PlaylistEntry[];
}

interface IslandPosition {
  x: number;
  y: number;
  playlist: PlaylistEntry;
}

const ISLAND_SIZE = 84;
const ROW_HEIGHT = 140;
const PADDING_X = 80;
const PADDING_Y = 60;

function computeLayout(
  playlists: PlaylistEntry[],
  containerWidth: number,
): { positions: IslandPosition[]; totalHeight: number } {
  if (playlists.length === 0 || containerWidth <= 0) {
    return { positions: [], totalHeight: 400 };
  }

  const sorted = [...playlists].sort((a, b) => a.orderIndex - b.orderIndex);
  const itemsPerRow = sorted.length >= 10 ? 4 : 3;

  const usableWidth = containerWidth - PADDING_X * 2;
  const numRows = Math.ceil(sorted.length / itemsPerRow);
  const totalHeight = numRows * ROW_HEIGHT + PADDING_Y * 2;

  const positions: IslandPosition[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const rowIndex = Math.floor(i / itemsPerRow);
    const posInRow = i % itemsPerRow;
    const isReversedRow = rowIndex % 2 === 1;

    const rowStart = rowIndex * itemsPerRow;
    const rowEnd = Math.min(rowStart + itemsPerRow, sorted.length);
    const itemsInThisRow = rowEnd - rowStart;

    const spacing = itemsInThisRow > 1 ? usableWidth / (itemsInThisRow - 1) : 0;

    let xOffset: number;
    if (itemsInThisRow === 1) {
      xOffset = containerWidth / 2;
    } else {
      const rawPos = posInRow * spacing;
      xOffset = PADDING_X + (isReversedRow ? usableWidth - rawPos : rawPos);
    }

    const yOffset = PADDING_Y + rowIndex * ROW_HEIGHT + ISLAND_SIZE / 2;

    positions.push({
      x: xOffset,
      y: yOffset,
      playlist: sorted[i],
    });
  }

  return { positions, totalHeight };
}

export function VoyageMap({ playlists }: VoyageMapProps) {
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
  const { positions, totalHeight } = computeLayout(playlists, containerWidth);
  const routePositions = positions.map((p) => ({ x: p.x, y: p.y }));

  // Place boat between first two islands
  let boatX = containerWidth / 2;
  let boatY = PADDING_Y;
  if (positions.length >= 2) {
    boatX = (positions[0].x + positions[1].x) / 2;
    boatY = (positions[0].y + positions[1].y) / 2 - 28;
  } else if (positions.length === 1) {
    boatX = positions[0].x + ISLAND_SIZE / 2 + 16;
    boatY = positions[0].y - 24;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Map container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          minHeight: 400,
          height: ready ? totalHeight : 400,
          background:
            "linear-gradient(180deg, #ffffff 0%, #f0f7ff 50%, #e8f1fb 100%)",
        }}
      >
        {ready && (
          <>
            {/* Layer 1: Waves */}
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              <VoyageWaves width={containerWidth} height={totalHeight} />
            </div>

            {/* Layer 2: Route lines */}
            {routePositions.length >= 2 && (
              <div className="absolute inset-0" style={{ zIndex: 2 }}>
                <VoyageRoute
                  positions={routePositions}
                  width={containerWidth}
                  height={totalHeight}
                />
              </div>
            )}

            {/* Layer 3: Boat decoration */}
            {playlists.length > 0 && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: boatX - 18,
                  top: boatY - 18,
                  zIndex: 3,
                }}
              >
                <VoyageBoat size={0.18} />
              </div>
            )}

            {/* Layer 4: Islands (on top) */}
            {positions.map(({ x, y, playlist }) => (
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
                <VoyageIsland
                  name={playlist.name}
                  slug={playlist.slug}
                  dropletCount={playlist.dropletCount}
                  size={ISLAND_SIZE}
                  isOnRoute={true}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Legend bar */}
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm text-slate-600">
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
              stroke="#2D6A4F"
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity={0.5}
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
