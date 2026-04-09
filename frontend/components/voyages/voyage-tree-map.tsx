"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { VoyageTreeIsland } from "./voyage-tree-island";

export interface TreeNode {
  id: number;
  label: string;
  slug?: string;
  dropletCount?: number;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentId?: number | null;
  orderIndex: number;
  status?: "completed" | "available" | "locked";
}

interface VoyageTreeMapProps {
  nodes: TreeNode[];
}

const MAIN_SIZE = 260;
const BRANCH_SIZE = 210;
const H_GAP = 80;
const V_GAP = 160;
const PADDING = 100;

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

  const getBranches = (parentId: number) =>
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

/** Assign positions: top-down centered, branches spread horizontally below parent */
function assignPositions(
  roots: LayoutNode[],
  containerWidth: number,
): { all: LayoutNode[]; height: number } {
  const all: LayoutNode[] = [];
  let y = PADDING;
  const cx = containerWidth / 2;

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

/** Smooth bezier from bottom of parent to top of child */
function bezierPath(
  px: number,
  py: number,
  cx: number,
  cy: number,
  parentSize: number,
  childSize: number,
): string {
  const sy = py + parentSize * 0.52;
  const ey = cy - childSize * 0.52;
  const my = (sy + ey) / 2;
  return `M ${px} ${sy} C ${px} ${my}, ${cx} ${my}, ${cx} ${ey}`;
}

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

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const { all: layoutNodes, height: totalHeight } = useMemo(
    () => assignPositions(tree, containerWidth),
    [tree, containerWidth],
  );

  // Build connectors
  const connectors = useMemo(() => {
    const lines: {
      px: number;
      py: number;
      cx: number;
      cy: number;
      pSize: number;
      cSize: number;
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
        pSize: MAIN_SIZE,
        cSize: MAIN_SIZE,
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
          pSize: MAIN_SIZE,
          cSize: BRANCH_SIZE,
          key: `m${layout.node.id}-b${child.node.id}`,
        });
      }
    }

    return lines;
  }, [layoutNodes]);

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
            {connectors.map(({ px, py, cx, cy, pSize, cSize, key }) => (
              <path
                key={key}
                d={bezierPath(px, py, cx, cy, pSize, cSize)}
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
            const size = isMain ? MAIN_SIZE : BRANCH_SIZE;

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
                  dropletCount={layout.node.dropletCount}
                  size={isMain ? "main" : "branch"}
                  status={layout.node.status}
                  stepNumber={isMain ? mainStep : undefined}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
