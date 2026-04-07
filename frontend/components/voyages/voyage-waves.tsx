interface VoyageWavesProps {
  width: number;
  height: number;
}

// Fixed pseudo-random wave cluster positions (deterministic, looks scattered)
// Each cluster is [cx, cy] as percentages of width/height
const WAVE_CLUSTERS: [number, number][] = [
  [0.08, 0.12],
  [0.22, 0.28],
  [0.78, 0.08],
  [0.92, 0.22],
  [0.15, 0.55],
  [0.85, 0.45],
  [0.42, 0.18],
  [0.58, 0.82],
  [0.33, 0.72],
  [0.67, 0.62],
  [0.05, 0.88],
  [0.95, 0.75],
  [0.48, 0.42],
];

// Each wave cluster renders two small quadratic bezier curves
function WaveCluster({ cx, cy }: { cx: number; cy: number }) {
  // First wave arc
  const x1 = cx;
  const y1 = cy;
  const cp1x = cx + 8;
  const cp1y = cy - 5;
  const x1end = cx + 16;
  const y1end = cy;

  // Second wave arc (offset below)
  const x2 = cx + 4;
  const y2 = cy + 6;
  const cp2x = cx + 12;
  const cp2y = cy + 1;
  const x2end = cx + 20;
  const y2end = cy + 6;

  return (
    <>
      <path
        d={`M ${x1} ${y1} Q ${cp1x} ${cp1y} ${x1end} ${y1end}`}
        stroke="#6BA3D6"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${x2} ${y2} Q ${cp2x} ${cp2y} ${x2end} ${y2end}`}
        stroke="#6BA3D6"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

export function VoyageWaves({ width, height }: VoyageWavesProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style={{ opacity: 0.12 }}
    >
      {WAVE_CLUSTERS.map(([pctX, pctY], i) => (
        <WaveCluster key={i} cx={pctX * width} cy={pctY * height} />
      ))}
    </svg>
  );
}
