// Type definitions for custom BlockNote blocks

import type { LucideIcon } from "lucide-react";

export type CalloutType =
  | "warning"
  | "question"
  | "important"
  | "definition"
  | "more-information"
  | "caution"
  | "default";

export interface CalloutConfig {
  backgroundColor: string;
  color: string;
  icon: LucideIcon;
  label: string;
}
