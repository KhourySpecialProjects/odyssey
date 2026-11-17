import type { Announcement, ReminderFeedData } from "@/types";

/** A reminder announcement; `reminder` overrides merge into the feed data. */
export function makeReminderAnnouncement({
  id = 7,
  reminder = {},
}: { id?: number; reminder?: Partial<ReminderFeedData> } = {}): Announcement {
  return {
    id,
    type: "reminder",
    content: "x",
    firstCreated: new Date(),
    droplet: { id: 1, name: "Git", slug: "git" },
    reminder: {
      headline: "Pick up Git where you left off.",
      progress: { viewed: 1, total: 3 },
      nextLesson: { name: "Branching", slug: "branching" },
      started: true,
      ...reminder,
    },
  } as unknown as Announcement;
}
