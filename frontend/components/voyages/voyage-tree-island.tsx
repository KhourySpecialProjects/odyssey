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
  const w = size === "main" ? 80 : 52;
  const h = size === "main" ? 68 : 44;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 85"
      fill="none"
      className="block"
    >
      {isLocked ? (
        <>
          <ellipse cx="50" cy="55" rx="38" ry="20" fill="#94a3b8" />
          <ellipse cx="50" cy="50" rx="34" ry="18" fill="#64748b" />
          <ellipse cx="44" cy="46" rx="26" ry="14" fill="#475569" />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="55" rx="38" ry="20" fill="#F4E5C0" />
          <ellipse cx="50" cy="50" rx="34" ry="18" fill="#6ABF69" />
          <ellipse cx="44" cy="46" rx="26" ry="14" fill="#4CAF50" />
          {/* Palm tree — bigger for main, smaller for branch */}
          {size === "main" ? (
            <>
              <path
                d="M54 46 Q56 32 52 20"
                stroke="#8D6E3F"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M52 20 Q40 16 32 22"
                stroke="#2E7D32"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M52 20 Q60 14 68 18"
                stroke="#2E7D32"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <path
                d="M54 46 Q56 34 52 24"
                stroke="#8D6E3F"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M52 24 Q44 20 38 24"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M52 24 Q58 18 64 22"
                stroke="#2E7D32"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </>
      )}
      {/* Status ring */}
      {status === "available" && (
        <ellipse
          cx="50"
          cy="52"
          rx="42"
          ry="22"
          stroke="#60a5fa"
          strokeWidth="2"
          fill="none"
          opacity={0.6}
        />
      )}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
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
        {/* Step number badge */}
        {stepNumber && (
          <div
            className="absolute -top-1.5 -left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: isLocked ? "#475569" : "#2D6A4F" }}
          >
            {stepNumber}
          </div>
        )}
        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute -top-1 -right-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-green-500 text-[9px] text-white">
            ✓
          </div>
        )}
        {/* Lock icon */}
        {isLocked && <LockIcon />}

        <IslandSvg size={size} status={status} />
      </div>

      {/* Label */}
      <div
        className={`mt-1 inline-block rounded-md px-2 py-0.5 font-bold shadow-sm ${
          isMain ? "bg-white/90 text-[11px]" : "bg-white/85 text-[9px]"
        } ${isLocked ? "opacity-70" : ""} text-slate-800`}
      >
        {label}
      </div>

      {/* Subtitle */}
      {dropletCount !== undefined && !isLocked && (
        <div
          className={`text-[9px] font-medium ${
            isCompleted
              ? "text-green-300"
              : status === "available"
                ? "text-blue-300"
                : "text-white/50"
          }`}
        >
          {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
        </div>
      )}

      {isCompleted && (
        <div className="text-[9px] font-semibold text-green-300">
          Completed ✓
        </div>
      )}

      {isLocked && <div className="text-[9px] text-white/40">Locked</div>}
    </div>
  );

  if (slug && !isLocked) {
    return <Link href={`/p/${slug}`}>{content}</Link>;
  }

  return content;
}
