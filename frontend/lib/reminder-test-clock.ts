/** Local-only gate for the reminder test route (ODY-931); mirrors isDevRoleOverrideEnabled. */
export function isReminderTestClockEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.ENABLE_REMINDER_TEST_CLOCK === "true";
}
