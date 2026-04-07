interface Position {
  x: number;
  y: number;
}

interface VoyageRouteProps {
  positions: Position[];
  width: number;
  height: number;
}

function buildCurvePath(from: Position, to: Position): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // If this is a row-turn (large dy, small horizontal movement or direction reversal),
  // use a tighter U-turn curve by pulling control points outward vertically.
  const isRowTurn = Math.abs(dy) > 60 && Math.abs(dx) < Math.abs(dy) * 1.5;

  if (isRowTurn) {
    // U-turn: control points swing out to the side of the closer island
    const sideOffset = dx > 0 ? 60 : -60;
    const cp1x = from.x + sideOffset;
    const cp1y = from.y + dy * 0.25;
    const cp2x = to.x + sideOffset;
    const cp2y = to.y - dy * 0.25;
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${to.y}`;
  }

  // Standard cubic bezier for same-row connections
  const cp1x = from.x + dx * 0.5;
  const cp1y = from.y;
  const cp2x = to.x - dx * 0.5;
  const cp2y = to.y;
  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${to.y}`;
}

function ArrowHead({ pos, prev }: { pos: Position; prev: Position }) {
  // Compute angle of arrival
  const angle = Math.atan2(pos.y - prev.y, pos.x - prev.x) * (180 / Math.PI);
  const size = 8;
  return (
    <polygon
      points={`0,${-size / 2} ${size},0 0,${size / 2}`}
      fill="#2D6A4F"
      opacity={0.5}
      transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}
    />
  );
}

export function VoyageRoute({ positions, width, height }: VoyageRouteProps) {
  if (positions.length < 2) return null;

  const paths: string[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    paths.push(buildCurvePath(positions[i], positions[i + 1]));
  }

  const last = positions[positions.length - 1];
  const secondLast = positions[positions.length - 2];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="#2D6A4F"
          strokeWidth="2.5"
          strokeDasharray="8 5"
          strokeLinecap="round"
          opacity={0.35}
          fill="none"
        />
      ))}
      <ArrowHead pos={last} prev={secondLast} />
    </svg>
  );
}
