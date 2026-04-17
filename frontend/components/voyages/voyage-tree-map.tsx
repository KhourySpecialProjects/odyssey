"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { VoyageTreeIsland, ISLAND_SVG_DIMENSIONS } from "./voyage-tree-island";

export interface TreeNode {
  id: number | string;
  label: string;
  slug?: string;
  href?: string;
  dropletCount?: number;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentId?: number | string | null;
  orderIndex: number;
  status?: "completed" | "available" | "locked";
  nodeType: "playlist" | "droplet";
  claimStatus?: "unclaimed" | "claimed" | "authored" | null;
}

interface VoyageTreeMapProps {
  nodes: TreeNode[];
  /** Horizontal center ratio for islands (0–1). 0.5 centers, >0.5 shifts right. */
  centerOffsetRatio?: number;
}

// Default desktop sizes. On narrower containers these scale down proportionally
// so multi-branch rows stay within the viewport.
const DEFAULT_MAIN_SIZE = 260;
const DEFAULT_BRANCH_SIZE = 210;
const DEFAULT_H_GAP = 100;
const DEFAULT_V_GAP = 180;
const PADDING = 60;
const MIN_MAIN_SIZE = 140;
const MIN_BRANCH_SIZE = 110;
const MIN_H_GAP = 32;

/** Compute layout sizes that fit within the container, accounting for
 *  the widest branch row in the tree. Sizing is based on the full
 *  container width (symmetric); horizontal placement is clamped
 *  separately in assignPositions so the tree can shift right without
 *  overflowing. */
function computeLayoutSizes(containerWidth: number, maxBranches: number) {
  const usable = Math.max(containerWidth - PADDING * 2, 0);
  // Each island div is rendered at width = size × 2 (to fit label bleed),
  // so the effective row width includes one extra island's worth on top of
  // the spacing between branch centers.
  const idealBranchRow =
    maxBranches > 0
      ? (maxBranches + 1) * DEFAULT_BRANCH_SIZE +
        (maxBranches - 1) * DEFAULT_H_GAP
      : 2 * DEFAULT_MAIN_SIZE;
  const scale = usable > 0 ? Math.min(1, usable / idealBranchRow) : 1;

  const MAIN_SIZE = Math.max(DEFAULT_MAIN_SIZE * scale, MIN_MAIN_SIZE);
  const BRANCH_SIZE = Math.max(DEFAULT_BRANCH_SIZE * scale, MIN_BRANCH_SIZE);
  const H_GAP = Math.max(DEFAULT_H_GAP * scale, MIN_H_GAP);
  const V_GAP = DEFAULT_V_GAP;

  return { MAIN_SIZE, BRANCH_SIZE, H_GAP, V_GAP };
}

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  children: LayoutNode[];
}

/** Build a tree from flat nodes: main nodes in vertical chain, branches as children */
function buildTree(nodes: TreeNode[]): LayoutNode[] {
  const mainNodes = nodes
    .filter((n) => n.isMainPath)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const getBranches = (parentId: number | string) =>
    nodes
      .filter((n) => !n.isMainPath && n.parentId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  return mainNodes.map((main) => {
    const branches = getBranches(main.id);
    return {
      node: main,
      x: 0,
      y: 0,
      children: branches.map((b) => ({ node: b, x: 0, y: 0, children: [] })),
    };
  });
}

/** Assign positions: top-down, branches spread horizontally below parent.
 *  cx is clamped so the widest rendered row (main island or branch row,
 *  each rendered at size × 2 width) stays within the container — the
 *  tree shifts toward centerOffsetRatio as far as it can without
 *  overflowing. */
function assignPositions(
  roots: LayoutNode[],
  containerWidth: number,
  sizes: ReturnType<typeof computeLayoutSizes>,
  centerOffsetRatio = 0.5,
): { all: LayoutNode[]; height: number } {
  const { MAIN_SIZE, BRANCH_SIZE, H_GAP, V_GAP } = sizes;
  const all: LayoutNode[] = [];
  let y = PADDING;

  const maxBranches = roots.reduce((m, r) => Math.max(m, r.children.length), 0);
  const mainHalfWidth = MAIN_SIZE;
  const branchRowHalfWidth =
    maxBranches > 0
      ? (maxBranches * BRANCH_SIZE + (maxBranches - 1) * H_GAP) / 2 +
        BRANCH_SIZE / 2
      : 0;
  const widestHalf = Math.max(mainHalfWidth, branchRowHalfWidth);
  const minCx = widestHalf + PADDING;
  const maxCx = containerWidth - widestHalf - PADDING;
  const desiredCx = containerWidth * centerOffsetRatio;
  // When the widest row plus padding doesn't fit, fall back to centering.
  const cx =
    minCx > maxCx
      ? containerWidth / 2
      : Math.min(Math.max(desiredCx, minCx), maxCx);

  for (const root of roots) {
    root.x = cx;
    root.y = y;
    all.push(root);
    y += MAIN_SIZE;

    if (root.children.length > 0) {
      y += V_GAP * 0.5;
      const totalW =
        root.children.length * BRANCH_SIZE + (root.children.length - 1) * H_GAP;
      let startX = cx - totalW / 2 + BRANCH_SIZE / 2;

      for (const child of root.children) {
        child.x = startX;
        child.y = y;
        all.push(child);
        startX += BRANCH_SIZE + H_GAP;
      }
      y += BRANCH_SIZE + 40; // extra space for labels below branches
    }

    y += V_GAP * 0.5;
  }

  return { all, height: y + PADDING };
}

/** Smooth bezier from bottom of parent to top of child, anchored to the
 *  rendered SVG geometry (not the layout box) so the line meets the island.
 *  A top offset prevents the line from overlapping the palm tree canopy.
 *  A bottom offset pushes the start below the label + subtitle text. */
const TREE_CANOPY_OFFSET = 45;
const LABEL_BELOW_OFFSET = 55;

function bezierPath(
  px: number,
  py: number,
  cx: number,
  cy: number,
  parentVisibleHeight: number,
  childVisibleHeight: number,
): string {
  const sy = py + parentVisibleHeight / 2 + LABEL_BELOW_OFFSET;
  const ey = cy - childVisibleHeight / 2 - TREE_CANOPY_OFFSET;
  const my = (sy + ey) / 2;
  return `M ${px} ${sy} C ${px} ${my}, ${cx} ${my}, ${cx} ${ey}`;
}

export function VoyageTreeMap({
  nodes,
  centerOffsetRatio = 0.5,
}: VoyageTreeMapProps) {
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

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  // Widest branch row drives the responsive scale.
  const maxBranches = useMemo(
    () => tree.reduce((max, root) => Math.max(max, root.children.length), 0),
    [tree],
  );

  const sizes = useMemo(
    () => computeLayoutSizes(containerWidth, maxBranches),
    [containerWidth, maxBranches],
  );

  const { all: layoutNodes, height: totalHeight } = useMemo(
    () => assignPositions(tree, containerWidth, sizes, centerOffsetRatio),
    [tree, containerWidth, sizes, centerOffsetRatio],
  );

  // Scale SVG visible heights by the same ratio used for layout sizing.
  const svgScale = sizes.MAIN_SIZE / DEFAULT_MAIN_SIZE;
  const mainVisibleHeight = ISLAND_SVG_DIMENSIONS.main.height * svgScale;
  const branchVisibleHeight = ISLAND_SVG_DIMENSIONS.branch.height * svgScale;

  // Build connectors
  const connectors = useMemo(() => {
    const lines: {
      px: number;
      py: number;
      cx: number;
      cy: number;
      pVisible: number;
      cVisible: number;
      key: string;
    }[] = [];
    const mainLayout = layoutNodes.filter((n) => n.node.isMainPath);

    for (let i = 0; i < mainLayout.length - 1; i++) {
      const from = mainLayout[i];
      const to = mainLayout[i + 1];

      // Always connect main-to-main (the spine)
      lines.push({
        px: from.x,
        py: from.y,
        cx: to.x,
        cy: to.y,
        pVisible: mainVisibleHeight,
        cVisible: mainVisibleHeight,
        key: `m${from.node.id}-m${to.node.id}`,
      });
    }

    // Parent to branch connectors
    for (const layout of mainLayout) {
      for (const child of layout.children) {
        lines.push({
          px: layout.x,
          py: layout.y,
          cx: child.x,
          cy: child.y,
          pVisible: mainVisibleHeight,
          cVisible: branchVisibleHeight,
          key: `m${layout.node.id}-b${child.node.id}`,
        });
      }
    }

    return lines;
  }, [layoutNodes, mainVisibleHeight, branchVisibleHeight]);

  const ready = containerWidth > 0;
  let mainStep = 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        minHeight: 400,
        height: ready ? totalHeight : 400,
      }}
    >
      {ready && (
        <>
          {/* SVG Connectors — smooth bezier curves */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={containerWidth}
            height={totalHeight}
            aria-hidden="true"
            style={{ zIndex: 1 }}
          >
            {connectors.map(({ px, py, cx, cy, pVisible, cVisible, key }) => (
              <path
                key={key}
                d={bezierPath(px, py, cx, cy, pVisible, cVisible)}
                stroke="rgba(45,106,79,0.3)"
                strokeWidth="2.5"
                fill="none"
              />
            ))}
          </svg>

          {/* Island nodes */}
          {layoutNodes.map((layout) => {
            const isMain = layout.node.isMainPath;
            if (isMain) mainStep++;
            const size = isMain ? sizes.MAIN_SIZE : sizes.BRANCH_SIZE;

            return (
              <div
                key={layout.node.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: layout.x - size,
                  top: layout.y - size / 2,
                  width: size * 2,
                  zIndex: 3,
                }}
              >
                {/* Branch type tag */}
                {!isMain && (
                  <div className="mb-0.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[7px] font-bold tracking-wider uppercase ${
                        layout.node.branchType === "optional"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {layout.node.branchType === "optional"
                        ? "optional"
                        : "required"}
                    </span>
                  </div>
                )}
                <VoyageTreeIsland
                  label={layout.node.label}
                  slug={layout.node.slug}
                  href={layout.node.href}
                  dropletCount={layout.node.dropletCount}
                  size={isMain ? "main" : "branch"}
                  status={layout.node.status}
                  stepNumber={isMain ? mainStep : undefined}
                  scale={svgScale}
                  nodeType={layout.node.nodeType}
                  claimStatus={layout.node.claimStatus}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
