import Link from "next/link";

interface VoyageTreeIslandProps {
  label: string;
  slug?: string;
  dropletCount?: number;
  size: "main" | "branch";
  status?: "completed" | "available" | "locked";
  stepNumber?: number;
}

function IslandSvg({
  size,
  status,
}: {
  size: "main" | "branch";
  status: string;
}) {
  const isLocked = status === "locked";
  const w = size === "main" ? 200 : 160;
  const h = size === "main" ? 180 : 145;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 180"
      fill="none"
      className="block"
    >
      {isLocked ? (
        <>
          {/* Water shadow */}
          <ellipse
            cx="100"
            cy="140"
            rx="70"
            ry="18"
            fill="#94a3b8"
            opacity={0.15}
          />
          {/* Cliff side — dark rock */}
          <path
            d="M40 120 Q38 132 42 138 Q60 150 100 152 Q140 150 158 138 Q162 132 160 120 Z"
            fill="#4a5568"
          />
          {/* Island top surface */}
          <ellipse cx="100" cy="120" rx="60" ry="24" fill="#64748b" />
          <ellipse cx="100" cy="118" rx="54" ry="20" fill="#718096" />
          {/* Dead stumps */}
          <path
            d="M105 118 Q107 106 104 96"
            stroke="#6b7280"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M104 96 Q98 93 93 97"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M104 96 Q110 93 114 96"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          {/* Ocean water ring */}
          <ellipse
            cx="100"
            cy="140"
            rx="82"
            ry="24"
            fill="#297496"
            opacity={0.3}
          />
          <ellipse
            cx="100"
            cy="138"
            rx="74"
            ry="21"
            fill="#297496"
            opacity={0.2}
          />

          {/* Sand/beach ring */}
          <ellipse cx="100" cy="124" rx="66" ry="28" fill="#F4E5C0" />

          {/* Green island surface */}
          <ellipse cx="100" cy="120" rx="58" ry="24" fill="#4CAF50" />
          {/* Subtle top highlight */}
          <ellipse
            cx="94"
            cy="114"
            rx="36"
            ry="14"
            fill="#66BB6A"
            opacity={0.45}
          />

          {size === "main" ? (
            <>
              {/* Main palm — tall, right of center */}
              <path
                d="M110 108 Q114 86 108 52"
                stroke="#5D3E1A"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Trunk rings */}
              <path
                d="M111 94 Q112 93 110 92.5"
                stroke="#8B6914"
                strokeWidth="1"
                opacity={0.3}
              />
              <path
                d="M112 82 Q113 81 111 80.5"
                stroke="#8B6914"
                strokeWidth="1"
                opacity={0.3}
              />
              <path
                d="M111 70 Q112 69 110 68.5"
                stroke="#8B6914"
                strokeWidth="1"
                opacity={0.3}
              />

              {/* Coconut cluster */}
              <circle cx="108" cy="54" r="3.5" fill="#8D6E3F" />
              <circle cx="112" cy="57" r="3" fill="#7D5E2F" />
              <circle cx="105" cy="57" r="2.8" fill="#6D4E1F" />

              {/* Main palm fronds */}
              <path
                d="M108 52 Q82 42 62 56"
                stroke="#2E7D32"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M108 52 Q86 36 68 44"
                stroke="#388E3C"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M108 52 Q130 40 150 52"
                stroke="#2E7D32"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M108 52 Q132 34 152 42"
                stroke="#388E3C"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M108 52 Q106 34 102 26"
                stroke="#43A047"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M108 52 Q114 36 118 28"
                stroke="#43A047"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Extra drooping fronds */}
              <path
                d="M108 52 Q78 50 58 64"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity={0.6}
              />
              <path
                d="M108 52 Q136 48 154 60"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity={0.6}
              />

              {/* Second palm — shorter, left */}
              <path
                d="M78 112 Q74 96 80 74"
                stroke="#5D3E1A"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="80" cy="75" r="2.5" fill="#8D6E3F" />
              <path
                d="M80 74 Q64 68 54 76"
                stroke="#2E7D32"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M80 74 Q68 62 60 66"
                stroke="#388E3C"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M80 74 Q92 66 102 72"
                stroke="#2E7D32"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M80 74 Q80 58 78 50"
                stroke="#43A047"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Branch — single palm, centered */}
              <path
                d="M104 108 Q107 88 103 60"
                stroke="#5D3E1A"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Trunk rings */}
              <path
                d="M105 92 Q106 91 104 90.5"
                stroke="#8B6914"
                strokeWidth="1"
                opacity={0.3}
              />
              <path
                d="M105.5 78 Q106.5 77 104.5 76.5"
                stroke="#8B6914"
                strokeWidth="1"
                opacity={0.3}
              />

              <circle cx="103" cy="62" r="3" fill="#8D6E3F" />
              <circle cx="106" cy="64" r="2.5" fill="#7D5E2F" />

              <path
                d="M103 60 Q84 52 68 64"
                stroke="#2E7D32"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M103 60 Q86 44 74 50"
                stroke="#388E3C"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M103 60 Q120 50 138 60"
                stroke="#2E7D32"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M103 60 Q120 44 134 48"
                stroke="#388E3C"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M103 60 Q102 42 100 34"
                stroke="#43A047"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </>
      )}
      {/* Available glow ring */}
      {status === "available" && (
        <ellipse
          cx="100"
          cy="120"
          rx="70"
          ry="30"
          stroke="#60a5fa"
          strokeWidth="2.5"
          fill="none"
          opacity={0.35}
        />
      )}
      {/* Completed ring */}
      {status === "completed" && (
        <ellipse
          cx="100"
          cy="120"
          rx="70"
          ry="30"
          stroke="#22c55e"
          strokeWidth="2.5"
          fill="none"
          opacity={0.35}
        />
      )}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#334155"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function VoyageTreeIsland({
  label,
  slug,
  dropletCount,
  size,
  status = "available",
  stepNumber,
}: VoyageTreeIslandProps) {
  const isMain = size === "main";
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  const content = (
    <div
      className={`text-center transition-transform duration-200 ${
        !isLocked ? "cursor-pointer hover:scale-105" : ""
      } ${isLocked ? "opacity-40" : ""}`}
    >
      <div className="relative inline-block">
        {/* Step number badge */}
        {stepNumber && (
          <div
            className="absolute -top-1 left-0 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: isLocked ? "#475569" : "#297496" }}
          >
            {stepNumber}
          </div>
        )}
        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute -top-1 right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[10px] text-white shadow-md">
            ✓
          </div>
        )}
        {/* Lock icon */}
        {isLocked && <LockIcon />}

        <IslandSvg size={size} status={status} />
      </div>

      {/* Label */}
      <div className="-mt-1 flex justify-center">
        <span
          className={`rounded-lg px-3 py-1.5 font-bold shadow-sm ${
            isMain
              ? "max-w-[200px] bg-white text-sm dark:bg-slate-800"
              : "max-w-[160px] bg-white text-xs dark:bg-slate-800"
          } ${isLocked ? "opacity-60" : ""} text-slate-900 dark:text-slate-100`}
        >
          {label}
        </span>
      </div>

      {/* Subtitle */}
      {dropletCount !== undefined && (
        <div
          className={`mt-1 text-center text-xs font-semibold ${
            isCompleted
              ? "text-green-700 dark:text-green-400"
              : isLocked
                ? "text-slate-400"
                : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
        </div>
      )}

      {isCompleted && (
        <div className="text-center text-xs font-bold text-green-700 dark:text-green-400">
          Completed ✓
        </div>
      )}

      {isLocked && (
        <div className="text-center text-xs font-medium text-slate-400">
          Locked
        </div>
      )}
    </div>
  );

  if (slug && !isLocked) {
    return <Link href={`/p/${slug}`}>{content}</Link>;
  }

  return content;
}
