"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { VoyageTreeIsland } from "./voyage-tree-island";
import { VoyageBoat } from "./voyage-boat";

export interface TreeNode {
  id: number;
  label: string;
  slug?: string;
  dropletCount?: number;
  isMainPath: boolean;
  branchType: "required" | "optional" | "pick-one";
  parentId?: number | null;
  orderIndex: number;
  status?: "completed" | "available" | "locked";
}

interface VoyageTreeMapProps {
  nodes: TreeNode[];
}

const MAIN_SIZE = 100;
const BRANCH_SIZE = 64;
const VERTICAL_SPACING = 240;
const PADDING_Y = 80;
const BRANCH_OFFSET_Y = 60;

const WAVES: [number, number][] = [
  [0.05, 0.06],
  [0.88, 0.04],
  [0.08, 0.3],
  [0.92, 0.35],
  [0.04, 0.55],
  [0.85, 0.6],
  [0.45, 0.85],
  [0.9, 0.9],
];

export function VoyageTreeMap({ nodes }: VoyageTreeMapProps) {
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

  const mainNodes = useMemo(
    () =>
      nodes
        .filter((n) => n.isMainPath)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [nodes],
  );

  const getBranches = (parentId: number) =>
    nodes
      .filter((n) => !n.isMainPath && n.parentId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  // S-curve positions for main islands
  const positions = useMemo(() => {
    if (containerWidth <= 0) return [];
    const marginX = Math.max(MAIN_SIZE, containerWidth * 0.15);
    const amplitude = (containerWidth - marginX * 2) / 2;
    const centerX = containerWidth / 2;

    return mainNodes.map((node, i) => {
      const x =
        mainNodes.length === 1
          ? centerX
          : centerX +
            amplitude *
              Math.cos(Math.PI * i + Math.PI) *
              (0.6 + 0.4 * (i / Math.max(mainNodes.length - 1, 1)));
      const y = PADDING_Y + i * VERTICAL_SPACING;
      return { x, y, node };
    });
  }, [mainNodes, containerWidth]);

  const totalHeight =
    PADDING_Y * 2 +
    Math.max(0, mainNodes.length - 1) * VERTICAL_SPACING +
    MAIN_SIZE;

  // Route path
  const routePath = useMemo(() => {
    if (positions.length < 2) return "";
    const parts = [`M ${positions[0].x} ${positions[0].y}`];
    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      const dy = (to.y - from.y) * 0.45;
      parts.push(
        `C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`,
      );
    }
    return parts.join(" ");
  }, [positions]);

  // Boat position: sits at the last completed main island, offset toward the next
  const boatPos = useMemo(() => {
    if (positions.length === 0) return { x: containerWidth / 2, y: PADDING_Y };

    // Find the last completed main island
    let lastCompletedIdx = -1;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].node.status === "completed") lastCompletedIdx = i;
    }

    if (lastCompletedIdx === -1) {
      // Nothing completed — put boat near the first island
      return {
        x: positions[0].x + 50,
        y: positions[0].y - 20,
      };
    }

    if (lastCompletedIdx < positions.length - 1) {
      // Between last completed and next island (30% along)
      const from = positions[lastCompletedIdx];
      const to = positions[lastCompletedIdx + 1];
      return {
        x: from.x + (to.x - from.x) * 0.3,
        y: from.y + (to.y - from.y) * 0.3,
      };
    }

    // All completed — put boat at the end
    const last = positions[positions.length - 1];
    return { x: last.x + 50, y: last.y + 20 };
  }, [positions, containerWidth]);

  const ready = containerWidth > 0;

  // Compute branch positions: placed below their parent main island, fanning out
  const branchPositions = useMemo(() => {
    const result: {
      branch: TreeNode;
      bx: number;
      by: number;
      px: number;
      py: number;
    }[] = [];
    for (const pos of positions) {
      const branches = getBranches(pos.node.id);
      if (branches.length === 0) continue;

      const totalWidth = branches.length * (BRANCH_SIZE + 30);
      const startX = pos.x - totalWidth / 2 + BRANCH_SIZE / 2;

      branches.forEach((branch, bi) => {
        const bx = startX + bi * (BRANCH_SIZE + 30);
        const by = pos.y + BRANCH_OFFSET_Y + MAIN_SIZE / 2;
        result.push({ branch, bx, by, px: pos.x, py: pos.y });
      });
    }
    return result;
  }, [positions, nodes]);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          minHeight: 400,
          height: ready ? totalHeight : 400,
          background:
            "linear-gradient(180deg, #1a6fb5 0%, #1b7ec7 30%, #2196d4 60%, #27a8e0 100%)",
        }}
      >
        {ready && (
          <>
            {/* Waves */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={containerWidth}
              height={totalHeight}
              aria-hidden="true"
            >
              {WAVES.map(([px, py], i) => (
                <text
                  key={i}
                  x={px * containerWidth}
                  y={py * totalHeight}
                  fill="white"
                  fontSize="16"
                  opacity={0.12}
                >
                  ≈
                </text>
              ))}
            </svg>

            {/* Main route dashed line */}
            {routePath && (
              <svg
                className="pointer-events-none absolute inset-0"
                width={containerWidth}
                height={totalHeight}
                aria-hidden="true"
                style={{ zIndex: 1 }}
              >
                <path
                  d={routePath}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="3.5"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}

            {/* Branch connector curves */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={containerWidth}
              height={totalHeight}
              aria-hidden="true"
              style={{ zIndex: 2 }}
            >
              {branchPositions.map(({ branch, bx, by, px, py }) => {
                const cp1x = px;
                const cp1y = py + (by - py) * 0.6;
                const cp2x = bx;
                const cp2y = by - (by - py) * 0.3;
                return (
                  <path
                    key={`line-${branch.id}`}
                    d={`M ${px} ${py + MAIN_SIZE * 0.3} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${bx} ${by - BRANCH_SIZE * 0.2}`}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              })}
            </svg>

            {/* Sailboat */}
            {positions.length > 0 && (
              <div
                className="pointer-events-none absolute"
                style={{ left: boatPos.x - 22, top: boatPos.y - 22, zIndex: 3 }}
              >
                <VoyageBoat size={0.25} />
              </div>
            )}

            {/* Main islands */}
            {positions.map(({ x, y, node }, idx) => (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: x - MAIN_SIZE / 2,
                  top: y - MAIN_SIZE / 2,
                  width: MAIN_SIZE + 20,
                  zIndex: 4,
                }}
              >
                <VoyageTreeIsland
                  label={node.label}
                  slug={node.slug}
                  dropletCount={node.dropletCount}
                  size="main"
                  status={node.status}
                  stepNumber={idx + 1}
                />
              </div>
            ))}

            {/* Branch islands — fanned out below their parent */}
            {branchPositions.map(({ branch, bx, by }) => (
              <div
                key={branch.id}
                className="absolute"
                style={{
                  left: bx - BRANCH_SIZE / 2,
                  top: by,
                  width: BRANCH_SIZE + 20,
                  zIndex: 5,
                }}
              >
                <div className="mb-0.5 text-center">
                  <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-bold tracking-wider text-white/90 uppercase backdrop-blur-sm">
                    {branch.branchType === "optional" ? "optional" : "required"}
                  </span>
                </div>
                <VoyageTreeIsland
                  label={branch.label}
                  slug={branch.slug}
                  dropletCount={branch.dropletCount}
                  size="branch"
                  status={branch.status}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="14" viewBox="0 0 100 85">
            <ellipse cx="50" cy="50" rx="38" ry="20" fill="#6ABF69" />
          </svg>
          <span>Main island</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="13" height="11" viewBox="0 0 100 85">
            <ellipse cx="50" cy="50" rx="38" ry="20" fill="#6ABF69" />
          </svg>
          <span>Branch island</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-green-500 text-[7px] text-white">
            ✓
          </div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="4" aria-hidden="true">
            <line
              x1="0"
              y1="2"
              x2="24"
              y2="2"
              stroke="#2D6A4F"
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity={0.5}
            />
          </svg>
          <span>Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <VoyageBoat size={0.1} color="#297496" />
          <span>Your voyage</span>
        </div>
      </div>
    </div>
  );
}
