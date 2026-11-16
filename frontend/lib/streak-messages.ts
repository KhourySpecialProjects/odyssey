import {
  STREAK_ICONS,
  streakIconIndex,
  type Streak,
  type StreakIconInfo,
  type StreakRevive,
} from "@/lib/streaks";

// What the streak UI says (ODY-919), shared by the header pill, the lesson
// banner, the toast and the feed card. Wording from the streak mockups.

type Message = { title: string; detail: string };

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** The icon a streak of `days` shows (null with none), and the next to unlock (null after the last) */
export function iconsFor(streakDays: number): {
  icon: StreakIconInfo | null;
  next: StreakIconInfo | null;
} {
  const index = streakIconIndex(streakDays);
  return {
    icon: index === null ? null : STREAK_ICONS[index],
    next: STREAK_ICONS[index === null ? 0 : index + 1] ?? null,
  };
}

/** Read out for an icon shown without its number, such as "22-day streak, Tied Sack" */
export function streakLabel(streakDays: number): string {
  const { icon } = iconsFor(streakDays);
  return icon ? `${streakDays}-day streak, ${icon.name}` : "No streak yet";
}

/** "Oct 17" for 2026-10-17, whatever the browser's time zone */
export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Once a lesson has lit today: the lit banner and the toast */
export function litMessage(current: number): Message {
  const { icon, next } = iconsFor(current);
  const grows = next
    ? `Your treasure grows again on day ${next.day}.`
    : "This is the final treasure. It stays for as long as your streak does.";
  const kept = current === 1 ? "Streak started." : "Streak kept.";
  return icon?.day === current
    ? { title: `Day ${current} · new treasure!`, detail: `${kept} ${grows}` }
    : { title: `Day ${current} · streak kept`, detail: grows };
}

/** The lesson banner before today is lit. `lessonCompleted` is this lesson, already finished. */
export function pendingMessage(
  streak: Pick<Streak, "current">,
  lessonCompleted: boolean,
): Message {
  const day = streak.current + 1;
  const goal = streak.current > 0 ? "keep your streak" : "start a streak";
  const { icon, next } = iconsFor(day);
  return {
    title: lessonCompleted
      ? `Finish a new lesson to ${goal}`
      : `Finish this lesson to ${goal}`,
    detail:
      icon?.day === day
        ? `Day ${day} unlocks ${icon.name}.`
        : next
          ? `It'll be day ${day}. Your treasure grows on day ${next.day}.`
          : `It'll be day ${day}.`,
  };
}

/** The popover's line under the icon: what's next once lit, or what lights today */
export function panelMessage(streak: Pick<Streak, "current" | "litToday">) {
  if (!streak.litToday) {
    return streak.current > 0
      ? `Finish a lesson to make it ${days(streak.current + 1)}.`
      : "Finish a lesson to start a streak.";
  }
  const { next } = iconsFor(streak.current);
  return next
    ? `${next.name} in ${days(next.day - streak.current)}. Finish a lesson each day to get there.`
    : "This is the final icon. It stays for as long as your streak.";
}

/** The feed card for the icon a streak unlocked last */
export function unlockedMessage(current: number): string {
  const { next } = iconsFor(current);
  return next
    ? `Next up: ${next.name} on day ${next.day}. Finish a lesson each day to keep it going.`
    : "This is the final icon. It stays for as long as your streak does.";
}

/** "2 revives left", "1 revive left" or "No revives left" (ODY-920) */
export function revivesLeftText(left: number): string {
  if (left < 1) return "No revives left";
  return `${left} ${left === 1 ? "revive" : "revives"} left`;
}

/** The popover's offer to revive yesterday */
export function reviveOfferMessage(
  revive: StreakRevive,
  revivesLeft: number,
): Message {
  return {
    title: `Your ${revive.ended}-day streak ended yesterday.`,
    detail: `Revive it to keep it going: it'll be ${days(revive.restored)}. You have ${revivesLeft} ${revivesLeft === 1 ? "revive" : "revives"} left.`,
  };
}

/** The toast once revived */
export function revivedMessage(
  streak: Pick<Streak, "current" | "revivesLeft">,
): Message {
  return {
    title: "Streak revived",
    detail: `It's a ${streak.current}-day streak again. ${revivesLeftText(streak.revivesLeft)}.`,
  };
}
