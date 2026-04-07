import Link from "next/link";
import { cn } from "@/lib/utils";

interface VoyageIslandProps {
  name: string;
  slug: string;
  dropletCount: number;
  size?: number;
  isOnRoute?: boolean;
}

export function VoyageIsland({
  name,
  slug,
  dropletCount,
  size = 84,
  isOnRoute = true,
}: VoyageIslandProps) {
  return (
    <Link
      href={`/p/${slug}`}
      className={cn(
        "flex flex-col items-center justify-center rounded-full border-2 text-center transition-all duration-200",
        "hover:scale-105 hover:shadow-lg",
        isOnRoute
          ? "border-[#2D6A4F] bg-[#D8F3DC] shadow-md"
          : "border-slate-300 bg-slate-100 shadow-sm",
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="line-clamp-2 px-2 text-xs leading-tight font-bold"
        style={{ color: "#1B4332" }}
      >
        {name}
      </span>
      <span className="mt-0.5 text-xs font-medium" style={{ color: "#40916C" }}>
        {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
      </span>
    </Link>
  );
}
