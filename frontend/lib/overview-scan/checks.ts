import { MEDIA_CHECKS } from "@/lib/overview-scan/rules/media";
import { STRUCTURE_CHECKS } from "@/lib/overview-scan/rules/structure";
import type { Check } from "@/lib/overview-scan/types";

// Every check the scan runs, column by column as the scan page shows them.
// ODY-791's content checks go first, as the page's first column.
export const CHECKS: readonly Check[] = [...STRUCTURE_CHECKS, ...MEDIA_CHECKS];
