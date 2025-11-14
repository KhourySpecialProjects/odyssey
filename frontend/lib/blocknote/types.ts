// Type definitions for custom BlockNote blocks

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
  icon: any;
  label: string;
}
