import type { MentorChatSummary } from "@/lib/requests/mentor-chats";

// Row helpers shared by the Mentor panel, the Mentor chats page and the home card.

/** "just now", "5 min ago", "3 hr ago", "2 days ago" */
export function relativeTime(iso: string | null, now = Date.now()) {
  const then = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export const chatTitle = (c: MentorChatSummary) => c.title?.trim() || "Chat";

export const startedIn = (c: MentorChatSummary) =>
  [c.lesson?.name, c.droplet?.name].filter(Boolean).join(" · ");

/** The start lesson's real route, with the chat for the Mentor panel to open */
export const continueHref = (c: MentorChatSummary) =>
  c.kind === "lesson" && c.droplet?.slug && c.lesson?.slug
    ? `/d/${c.droplet.slug}/${c.lesson.slug}?mentorChat=${c.documentId}`
    : null;
