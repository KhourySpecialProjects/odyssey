import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CALLOUT_CONTAINER_CLASS,
  CALLOUT_ICON_CLASS,
  CALLOUT_STYLES,
  CALLOUT_TEXT_CLASS,
  isCalloutType,
} from "@/lib/blocknote/callout-styles";
import { CalloutIcon } from "@/components/ui/callout-icons";

interface CalloutSurfaceProps {
  /** Callout type stored on the block (`block.type`). */
  type?: string;
  /** Legacy Tailwind colour class, used when `type` isn't a BlockNote type. */
  color?: string;
  iconEnabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Read-only callout frame matching the creator's BlockNote callout.
 * Classic callouts (no BlockNote type) keep their stored colour class.
 */
export function CalloutSurface({
  type,
  color,
  iconEnabled,
  className,
  children,
}: CalloutSurfaceProps) {
  if (!isCalloutType(type)) {
    return (
      <div
        data-callout-type="legacy"
        className={cn(
          CALLOUT_CONTAINER_CLASS,
          "border dark:border-slate-500",
          color || "bg-sky-50 dark:bg-sky-800",
          className,
        )}
      >
        {iconEnabled && <CalloutIcon color={color || "bg-sky-300"} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  const { bg, icon: Icon } = CALLOUT_STYLES[type];
  return (
    <div
      data-callout-type={type}
      className={cn(CALLOUT_CONTAINER_CLASS, CALLOUT_TEXT_CLASS, className)}
      style={{ backgroundColor: bg }}
    >
      {iconEnabled !== false && (
        <div className="flex shrink-0 items-center p-1">
          <Icon size={24} strokeWidth={2} className={CALLOUT_ICON_CLASS} />
        </div>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
