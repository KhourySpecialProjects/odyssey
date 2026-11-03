import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ViewStatus } from "@/lib/overview-scan/view";

const LOOK: Record<ViewStatus | "running", string> = {
  "not-run": "border-[1.5px] border-[#98a2b3] bg-white",
  pass: "border-[1.5px] border-[#16a34a] bg-[#16a34a] text-white",
  warn: "border-[1.5px] border-[#d97706] bg-[#f59e0b] text-[#451a03]",
  unknown: "border-[1.5px] border-[#64748b] bg-[#94a3b8] text-white",
  running:
    "animate-spin border-2 border-[#d0d5dd] border-t-[#2d7597] motion-reduce:animate-none motion-reduce:border-dashed",
};

/** A check's or rule's status as a circle; the status word sits beside it. */
export function StatusCircle({
  status,
  small = false,
}: {
  status: ViewStatus | "running";
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none font-bold",
        small ? "size-[15px] text-[10px]" : "size-5 text-xs",
        LOOK[status],
      )}
    >
      {status === "pass" && <IconCheck size={small ? 10 : 13} stroke={3} />}
      {status === "warn" && "!"}
      {status === "unknown" && "?"}
    </span>
  );
}
