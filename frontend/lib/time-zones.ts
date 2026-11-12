import type { TimeZone } from "@/types";

/** The zones a user can pick, matching the authorized-user `timeZone` enum. */
export const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
] as const satisfies readonly TimeZone[];

// Fails to compile if the TimeZone type gains a zone this list lacks.
type UnlistedTimeZone = Exclude<TimeZone, (typeof TIME_ZONES)[number]>;
const allZonesListed: [UnlistedTimeZone] extends [never] ? true : never = true;
void allZonesListed;

/** Every reader's fallback when a user has no saved zone. */
export const DEFAULT_TIME_ZONE: TimeZone = "America/New_York";

export function isTimeZone(value: unknown): value is TimeZone {
  return (TIME_ZONES as readonly unknown[]).includes(value);
}

/** The user's saved zone, or New York when it is missing or not a listed zone. */
export function userTimeZone(value: string | null | undefined): TimeZone {
  return isTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}
