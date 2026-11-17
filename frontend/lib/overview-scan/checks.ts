import { CONTENT_CHECKS } from "@/lib/overview-scan/rules/content";
import { MEDIA_CHECKS } from "@/lib/overview-scan/rules/media";
import { STRUCTURE_CHECKS } from "@/lib/overview-scan/rules/structure";
import type { Check } from "@/lib/overview-scan/types";

// Every check the scan runs, column by column as the scan page shows them.
// Server only, because the spell-check reads its dictionary from disk: a page
// passes the titles and rule texts down to its client components.
export const CHECKS: readonly Check[] = [
  ...CONTENT_CHECKS,
  ...STRUCTURE_CHECKS,
  ...MEDIA_CHECKS,
];
