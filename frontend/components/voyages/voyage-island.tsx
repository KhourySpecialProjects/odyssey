import Link from "next/link";

interface VoyageIslandProps {
  name: string;
  slug: string;
  dropletCount: number;
  size?: number;
}

/** SVG island shape — a sandy/green landmass with a palm tree */
function IslandSvg({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0"
      aria-hidden="true"
    >
      {/* Sand base */}
      <ellipse cx="50" cy="62" rx="40" ry="22" fill="#F4E5C0" />
      {/* Green terrain */}
      <ellipse cx="50" cy="56" rx="36" ry="20" fill="#6ABF69" />
      <ellipse cx="44" cy="52" rx="28" ry="16" fill="#4CAF50" />
      {/* Palm trunk */}
      <path
        d="M54 52 Q56 36 52 22"
        stroke="#8D6E3F"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Palm leaves */}
      <path
        d="M52 22 Q40 18 32 24"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 22 Q46 14 36 16"
        stroke="#388E3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 22 Q60 16 68 20"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 22 Q58 12 66 14"
        stroke="#388E3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Water ring around island */}
      <ellipse
        cx="50"
        cy="64"
        rx="44"
        ry="24"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function VoyageIsland({
  name,
  slug,
  dropletCount,
  size = 90,
}: VoyageIslandProps) {
  return (
    <Link
      href={`/p/${slug}`}
      className="group relative flex flex-col items-center justify-end text-center transition-transform duration-200 hover:scale-110"
      style={{ width: size, height: size }}
    >
      <IslandSvg size={size} />
      {/* Label below the island */}
      <div
        className="absolute z-10 flex flex-col items-center"
        style={{ top: size + 4, width: size * 1.6, left: -(size * 0.3) }}
      >
        <span className="rounded-md bg-white/90 px-2 py-0.5 text-center text-xs leading-tight font-bold text-slate-800 shadow-sm backdrop-blur-sm">
          {name}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-slate-800 drop-shadow-sm">
          {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
        </span>
      </div>
    </Link>
  );
}
