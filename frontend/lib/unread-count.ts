/** The badge text for an unread count; null when nothing should render. */
export function formatUnreadCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}
