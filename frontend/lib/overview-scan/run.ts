import { RULES_VERSION } from "@/lib/overview-scan/config";
// Type only: network.ts is server only
import type { FetchUrl } from "@/lib/overview-scan/network";
import type {
  Check,
  CheckResult,
  Flag,
  RuleResult,
  ScanDocument,
  ScanResult,
  ScanStatus,
} from "@/lib/overview-scan/types";

/**
 * Runs every check on a snapshot (ODY-790). Checks and their rules run at the
 * same time; results keep the order they were given in. A rule that throws
 * is reported as couldn't check, so one broken rule never stops the scan.
 */
export async function runChecks(
  doc: ScanDocument,
  checks: readonly Check[],
  fetchUrl: FetchUrl,
): Promise<ScanResult> {
  const results = await Promise.all(
    checks.map((check) => runCheck(doc, check, fetchUrl)),
  );
  const count = (status: ScanStatus) =>
    results.filter((r) => r.status === status).length;
  return {
    rulesVersion: RULES_VERSION,
    passed: count("pass"),
    needsAttention: count("warn"),
    couldNotCheck: count("unknown"),
    results,
  };
}

async function runCheck(
  doc: ScanDocument,
  check: Check,
  fetchUrl: FetchUrl,
): Promise<CheckResult> {
  const rules = await Promise.all(
    check.rules.map(async (rule): Promise<RuleResult> => {
      try {
        const flags = await rule.run(doc, fetchUrl);
        return { id: rule.id, status: statusOf(flags), flags };
      } catch (error) {
        console.error(
          `Overview scan rule ${check.id}/${rule.id} failed`,
          error,
        );
        return { id: rule.id, status: "unknown", flags: [RULE_FAILED] };
      }
    }),
  );
  return { id: check.id, status: worst(rules.map((r) => r.status)), rules };
}

const RULE_FAILED: Flag = {
  partId: "droplet",
  blockId: null,
  message: "This rule hit an error, so it couldn't be checked.",
  severity: "unknown",
};

/** Needs attention if any flag is "warn", couldn't check if all are "unknown". */
const statusOf = (flags: readonly Flag[]): ScanStatus =>
  flags.some((f) => f.severity === "warn")
    ? "warn"
    : flags.length
      ? "unknown"
      : "pass";

/** A check takes its worst rule's status: warn, then unknown, then pass. */
const worst = (statuses: readonly ScanStatus[]): ScanStatus =>
  statuses.includes("warn")
    ? "warn"
    : statuses.includes("unknown")
      ? "unknown"
      : "pass";
