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
  const w = size === "main" ? 130 : 100;
  const h = size === "main" ? 110 : 85;

  return (
    <svg
      width={w}
      height={h}
      viewBox="-10 -20 120 110"
      fill="none"
      className="block"
    >
      {isLocked ? (
        <>
          {/* Locked island — gray, no trees */}
          <ellipse
            cx="50"
            cy="62"
            rx="42"
            ry="18"
            fill="#cbd5e1"
            opacity={0.5}
          />
          <ellipse cx="50" cy="58" rx="40" ry="20" fill="#94a3b8" />
          <ellipse cx="50" cy="54" rx="36" ry="18" fill="#64748b" />
          <ellipse cx="46" cy="50" rx="28" ry="14" fill="#475569" />
          {/* Dead tree stump */}
          <path
            d="M52 50 Q53 42 51 36"
            stroke="#6b7280"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M51 36 Q46 34 42 37"
            stroke="#6b7280"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M51 36 Q56 33 59 36"
            stroke="#6b7280"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          {/* Water shadow ring */}
          <ellipse
            cx="50"
            cy="64"
            rx="44"
            ry="19"
            fill="#93c5fd"
            opacity={0.15}
          />
          {/* Sand base with texture */}
          <ellipse cx="50" cy="60" rx="42" ry="18" fill="#F4E5C0" />
          <ellipse
            cx="54"
            cy="61"
            rx="12"
            ry="5"
            fill="#E8D5A8"
            opacity={0.6}
          />
          {/* Grass layers */}
          <ellipse cx="50" cy="55" rx="38" ry="19" fill="#6ABF69" />
          <ellipse cx="46" cy="51" rx="30" ry="15" fill="#4CAF50" />
          <ellipse cx="42" cy="48" rx="20" ry="10" fill="#43A047" />
          {/* Small bushes */}
          <circle cx="30" cy="52" r="4" fill="#388E3C" opacity={0.7} />
          <circle cx="64" cy="54" r="3.5" fill="#388E3C" opacity={0.6} />
          <circle cx="38" cy="47" r="3" fill="#2E7D32" opacity={0.5} />

          {size === "main" ? (
            <>
              {/* Main palm tree (tall, center-right) */}
              <path
                d="M55 50 Q58 36 54 18"
                stroke="#6D4C2A"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Coconuts */}
              <circle cx="54" cy="19" r="2" fill="#8D6E3F" />
              <circle cx="56" cy="21" r="1.8" fill="#7D5E2F" />
              {/* Palm fronds — lush */}
              <path
                d="M54 18 Q38 12 28 20"
                stroke="#2E7D32"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M54 18 Q40 8 30 12"
                stroke="#388E3C"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M54 18 Q64 10 74 16"
                stroke="#2E7D32"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M54 18 Q66 6 76 10"
                stroke="#388E3C"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M54 18 Q52 6 48 4"
                stroke="#43A047"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Second smaller palm (left) */}
              <path
                d="M34 52 Q32 42 35 32"
                stroke="#6D4C2A"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M35 32 Q26 28 20 32"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M35 32 Q28 24 24 26"
                stroke="#388E3C"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M35 32 Q42 26 48 30"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Small rocks */}
              <ellipse
                cx="62"
                cy="56"
                rx="3"
                ry="2"
                fill="#a1887f"
                opacity={0.5}
              />
              <ellipse
                cx="68"
                cy="58"
                rx="2"
                ry="1.5"
                fill="#8d6e63"
                opacity={0.4}
              />
            </>
          ) : (
            <>
              {/* Branch palm (single, centered) */}
              <path
                d="M52 48 Q54 36 51 22"
                stroke="#6D4C2A"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="51" cy="23" r="1.8" fill="#8D6E3F" />
              <path
                d="M51 22 Q40 17 32 22"
                stroke="#2E7D32"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M51 22 Q42 12 36 14"
                stroke="#388E3C"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M51 22 Q60 15 68 20"
                stroke="#2E7D32"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M51 22 Q60 10 66 12"
                stroke="#388E3C"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Small rock */}
              <ellipse
                cx="62"
                cy="54"
                rx="2.5"
                ry="1.5"
                fill="#a1887f"
                opacity={0.4}
              />
            </>
          )}
        </>
      )}
      {/* Available glow ring */}
      {status === "available" && (
        <ellipse
          cx="50"
          cy="55"
          rx="46"
          ry="22"
          stroke="#60a5fa"
          strokeWidth="2"
          fill="none"
          opacity={0.5}
        />
      )}
      {/* Completed golden ring */}
      {status === "completed" && (
        <ellipse
          cx="50"
          cy="55"
          rx="46"
          ry="22"
          stroke="#22c55e"
          strokeWidth="2"
          fill="none"
          opacity={0.4}
        />
      )}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="24"
      height="24"
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
      } ${isLocked ? "opacity-40" : ""} ${
        status === "available" ? "animate-pulse-slow" : ""
      }`}
    >
      <div className="relative inline-block">
        {/* Step number badge — top left */}
        {stepNumber && (
          <div
            className="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
            style={{ backgroundColor: isLocked ? "#475569" : "#297496" }}
          >
            {stepNumber}
          </div>
        )}
        {/* Completed checkmark — top right */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[9px] text-white shadow">
            ✓
          </div>
        )}
        {/* Lock icon */}
        {isLocked && <LockIcon />}

        <IslandSvg size={size} status={status} />
      </div>

      {/* Label */}
      <div className="mt-1 flex justify-center">
        <span
          className={`rounded-md px-2.5 py-1 font-bold shadow ${
            isMain
              ? "bg-white text-xs dark:bg-slate-800"
              : "bg-white text-[10px] dark:bg-slate-800"
          } ${isLocked ? "opacity-60" : ""} text-slate-900 dark:text-slate-100`}
        >
          {label}
        </span>
      </div>

      {/* Subtitle */}
      {dropletCount !== undefined && (
        <div
          className={`mt-0.5 text-center text-[10px] font-semibold ${
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
        <div className="text-center text-[10px] font-bold text-green-700 dark:text-green-400">
          Completed ✓
        </div>
      )}

      {isLocked && (
        <div className="text-center text-[10px] font-medium text-slate-400">
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
