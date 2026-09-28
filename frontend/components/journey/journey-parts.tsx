import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

/** The Odyssey logo's sailboat (components/ui/animated-sailboat.tsx). */
export function BoatMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="36 20 154 154"
      className={cn("fill-[#297496] dark:fill-[#5FB4E5]", className)}
      aria-hidden="true"
    >
      <path d="M42.9597 142.397C65.2693 115.837 75.9204 63.5456 78.6662 39.0664C78.7191 38.5946 79.3377 38.4809 79.5848 38.887C103.772 78.6532 94.7779 126.739 87.016 146.448C86.9157 146.703 86.6347 146.813 86.3784 146.716C71.5974 141.123 52.4669 141.962 43.4307 143.241C42.9659 143.306 42.658 142.757 42.9597 142.397Z" />
      <path d="M93.3006 148.372C115.912 95.4475 93.7047 44.9461 78.1555 25.3824C77.8401 24.9855 78.2695 24.4296 78.7475 24.5983C152.982 50.8002 173.648 112.382 174.778 140.831C174.792 141.189 174.431 141.421 174.096 141.294C144.219 129.982 109.155 141.328 93.9998 149.045C93.5761 149.261 93.1138 148.809 93.3006 148.372Z" />
      <path d="M185.15 149.731L39.9206 154.446C39.5241 154.459 39.2998 154.906 39.5266 155.232L50.1328 170.452C50.2263 170.587 50.3795 170.666 50.5431 170.666H163.011C163.071 170.666 163.133 170.655 163.19 170.633C180.461 164.047 185.292 154.612 185.645 150.227C185.668 149.945 185.433 149.722 185.15 149.731Z" />
    </svg>
  );
}

export function FinaleLinks({ onFocus }: { onFocus?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <Link
        href="/explore"
        onFocus={onFocus}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-[#2D7597] px-6 text-sm font-medium text-white transition-colors hover:bg-[#255e78] focus-visible:ring-2 focus-visible:ring-[#2D7597]/50 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
      >
        Explore Odyssey <ArrowRightIcon className="h-4 w-4" />
      </Link>
      <Link
        href="/about"
        onFocus={onFocus}
        className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-5 text-sm font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#2D7597]/50 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        Learn about Odyssey
      </Link>
    </div>
  );
}
