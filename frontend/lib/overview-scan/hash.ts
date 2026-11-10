import { createHash } from "crypto";
import type { ScanDocument } from "@/lib/overview-scan/types";

/** JSON with object keys sorted, so equal content always gives equal text. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Fingerprint of what the scan read (ODY-878): sha256 of the ScanDocument.
 * The scan saves it, and the scan page hashes a fresh document to compare.
 * Lock writes and timestamps are not in the document, so they never change it.
 */
export const hashScanDocument = (doc: ScanDocument): string =>
  createHash("sha256").update(stableStringify(doc)).digest("hex");
