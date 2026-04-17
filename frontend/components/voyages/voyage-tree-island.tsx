import Link from "next/link";

// Rendered SVG dimensions — shared with voyage-tree-map so connectors can
// anchor to actual island geometry, not the (larger) layout box.
export const ISLAND_SVG_DIMENSIONS = {
  main: { width: 200, height: 180 },
  branch: { width: 160, height: 145 },
} as const;

const PUDDLE_OUTER_PATH =
  "M28 138 C30 132 42 126 62 124 C72 123 78 120 90 122 C102 124 108 121 120 122 C140 124 158 128 168 134 C174 138 172 146 160 150 C148 154 132 156 116 157 C100 158 82 158 66 156 C48 154 34 148 28 142 Z";
const PUDDLE_INNER_PATH =
  "M42 139 C44 134 56 130 72 128 C82 127 90 126 100 127 C112 128 122 126 134 128 C148 130 156 134 156 139 C156 144 146 148 132 150 C118 152 98 152 82 151 C62 150 46 146 42 142 Z";

interface VoyageTreeIslandProps {
  label: string;
  slug?: string;
  dropletCount?: number;
  size: "main" | "branch";
  status?: "completed" | "available" | "locked";
  stepNumber?: number;
  /** Visual scale factor for responsive sizing (1 = default). */
  scale?: number;
  href?: string;
  nodeType?: "playlist" | "droplet";
  claimStatus?: "unclaimed" | "claimed" | "authored" | null;
}

function IslandSvg({
  size,
  status,
  scale = 1,
  nodeType = "playlist",
  claimStatus,
}: {
  size: "main" | "branch";
  status: string;
  scale?: number;
  nodeType?: "playlist" | "droplet";
  claimStatus?: "unclaimed" | "claimed" | "authored" | null;
}) {
  const isLocked = status === "locked";
  const base = ISLAND_SVG_DIMENSIONS[size];
  const w = base.width * scale;
  const h = base.height * scale;

  // Unclaimed and claimed (in progress) both use the same puddle SVG
  // The subtitle text differentiates them ("Become author!" vs "In Progress")
  if (
    nodeType === "droplet" &&
    (claimStatus === "unclaimed" || claimStatus === "claimed")
  ) {
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 200 180"
        fill="none"
        className="block"
      >
        {/* Three water drops above puddle */}
        <path
          d="M100 56 C100 56 94 66 94 71 C94 74.3 96.7 77 100 77 C103.3 77 106 74.3 106 71 C106 66 100 56 100 56Z"
          stroke="#94a3b8"
          strokeWidth="3"
          fill="none"
          opacity={0.4}
        />
        <path
          d="M78 76 C78 76 73 84 73 88 C73 90.8 75.2 93 78 93 C80.8 93 83 90.8 83 88 C83 84 78 76 78 76Z"
          stroke="#94a3b8"
          strokeWidth="2.5"
          fill="none"
          opacity={0.35}
        />
        <path
          d="M122 76 C122 76 117 84 117 88 C117 90.8 119.2 93 122 93 C124.8 93 127 90.8 127 88 C127 84 122 76 122 76Z"
          stroke="#94a3b8"
          strokeWidth="2.5"
          fill="none"
          opacity={0.35}
        />
        {/* Puddle — dashed outline */}
        <path
          d={PUDDLE_OUTER_PATH}
          stroke="#94a3b8"
          strokeWidth="3"
          strokeDasharray="8 5"
          fill="none"
          opacity={0.35}
        />
        {/* Inner puddle fill */}
        <path d={PUDDLE_INNER_PATH} fill="#e2e8f0" opacity={0.4} />
        {status === "available" && (
          <path
            d={PUDDLE_OUTER_PATH}
            stroke="#60a5fa"
            strokeWidth="2.5"
            fill="none"
            opacity={0.25}
          />
        )}
      </svg>
    );
  }

  // Droplet node — published: full teal puddle with water drop
  if (nodeType === "droplet") {
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
            {/* Locked spill — gray */}
            <path d={PUDDLE_INNER_PATH} fill="#94a3b8" opacity={0.15} />
            <path
              d="M65 132 C75 126 95 124 115 126 C130 128 142 132 145 136"
              stroke="#94a3b8"
              strokeWidth="1"
              fill="none"
              opacity={0.1}
            />
          </>
        ) : (
          <>
            {/* Outer spill glow */}
            <path d={PUDDLE_OUTER_PATH} fill="#297496" opacity={0.08} />
            {/* Main spill */}
            <path d={PUDDLE_INNER_PATH} fill="#cffafe" />
            <path d={PUDDLE_INNER_PATH} fill="#297496" opacity={0.3} />
            {/* Organic ripple lines */}
            <path
              d="M60 134 C72 126 92 122 112 124 C132 126 148 132 150 138"
              stroke="#297496"
              strokeWidth="1.5"
              fill="none"
              opacity={0.3}
            />
            <path
              d="M74 136 C84 130 102 128 120 130 C134 132 142 136 140 139"
              stroke="#297496"
              strokeWidth="1"
              fill="none"
              opacity={0.2}
            />
            <path
              d="M88 137 C96 134 108 133 118 135"
              stroke="#297496"
              strokeWidth="0.8"
              fill="none"
              opacity={0.15}
            />
            {/* Water drop */}
            <path
              d="M100 82 C100 82 91 96 91 103 C91 108 95 112 100 112 C105 112 109 108 109 103 C109 96 100 82 100 82Z"
              fill="#297496"
              opacity={0.7}
            />
            {/* Drop highlight */}
            <path
              d="M96 105 C96 102 98 99 100 97"
              stroke="#cffafe"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.6}
            />
            {/* Splash dots */}
            <circle cx="80" cy="122" r="2.5" fill="#297496" opacity={0.25} />
            <circle cx="124" cy="124" r="2" fill="#297496" opacity={0.2} />
            <circle cx="68" cy="140" r="1.5" fill="#297496" opacity={0.15} />
            <circle cx="136" cy="142" r="1.5" fill="#297496" opacity={0.12} />
            {status === "completed" && (
              <path
                d={PUDDLE_OUTER_PATH}
                stroke="#22c55e"
                strokeWidth="2.5"
                fill="none"
                opacity={0.4}
              />
            )}
          </>
        )}
        {status === "available" && !isLocked && (
          <path
            d={PUDDLE_OUTER_PATH}
            stroke="#60a5fa"
            strokeWidth="2.5"
            fill="none"
            opacity={0.3}
          />
        )}
      </svg>
    );
  }

  // Default: playlist island (existing rendering)
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
  scale = 1,
  href: hrefProp,
  nodeType = "playlist",
  claimStatus,
}: VoyageTreeIslandProps) {
  const isMain = size === "main";
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isDropletNode = nodeType === "droplet";
  const isUnclaimed = claimStatus === "unclaimed";
  const isClaimed = claimStatus === "claimed";

  // Compute subtitle text based on node type and claim state
  let subtitleText: string | null = null;
  if (isDropletNode && isUnclaimed) {
    subtitleText = "Become author!";
  } else if (isDropletNode && isClaimed) {
    subtitleText = "In Progress";
  } else if (isDropletNode) {
    subtitleText = "1 droplet";
  } else if (dropletCount !== undefined) {
    subtitleText = `${dropletCount} ${dropletCount === 1 ? "droplet" : "droplets"}`;
  }

  // Subtitle color: teal for unclaimed/claimed droplet nodes
  const subtitleColorClass = isCompleted
    ? "text-green-700 dark:text-green-400"
    : isLocked
      ? "text-slate-400"
      : "text-slate-600 dark:text-slate-300";

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

        <IslandSvg
          size={size}
          status={status}
          scale={scale}
          nodeType={nodeType}
          claimStatus={claimStatus}
        />
      </div>

      {/* Label */}
      <div className="-mt-1 flex justify-center">
        <div
          title={label}
          className={`truncate rounded-lg border border-slate-100 px-3 py-1.5 text-center font-bold shadow ${
            isMain
              ? "w-[200px] bg-white text-sm dark:bg-slate-800"
              : "w-[160px] bg-white text-xs dark:bg-slate-800"
          } ${isLocked ? "opacity-60" : ""} text-slate-900 dark:border-slate-700 dark:text-slate-100`}
        >
          {label}
        </div>
      </div>

      {/* Subtitle */}
      {subtitleText !== null && (
        <div
          className={`mt-1 text-center text-xs font-semibold ${subtitleColorClass}`}
        >
          {subtitleText}
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

  // Resolve href: explicit prop takes priority, then derive from slug + nodeType
  const resolvedHref =
    hrefProp ?? (slug ? (isDropletNode ? `/d/${slug}` : `/p/${slug}`) : null);

  if (resolvedHref && !isLocked) {
    return <Link href={resolvedHref}>{content}</Link>;
  }

  return content;
}
