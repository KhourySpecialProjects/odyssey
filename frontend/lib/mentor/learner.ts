// The learner block Mentor sends after the lesson (ODY-934): a short, bounded
// summary of the student's own history. No server-only import, so the eval
// scripts can use it; the fetch that feeds it lives in learner-source.ts.
import { DEFAULT_STREAK_TIME_ZONE, localDate } from "@/lib/streaks";

export type LearnerContext = {
  /** Newest first, at most 15. `month` is "YYYY-MM" */
  finished: {
    name: string;
    tags: string[];
    difficulty: string | null;
    month: string;
  }[];
  /** At most 5 */
  inProgress: { name: string; viewed: number; total: number }[];
  /** The current droplet's prerequisites */
  prerequisites: { name: string; finished: boolean }[];
  /** Titles of this droplet's lessons the student has viewed */
  viewedLessons: string[];
};

/** About 600 tokens at 4 characters a token; the oldest finished droplets go first */
export const LEARNER_MAX_CHARS = 2400;

const section = (title: string, lines: string[]) => [
  title,
  ...(lines.length ? lines : ["none"]).map((line) => `- ${line}`),
];

function render(learner: LearnerContext): string {
  const finished = learner.finished.map(({ name, tags, difficulty, month }) => {
    const details = [difficulty, tags.join(", ")].filter(Boolean).join("; ");
    return `${name}${details ? ` (${details})` : ""}, finished ${month}`;
  });
  const inProgress = learner.inProgress.map(
    ({ name, viewed, total }) =>
      `${name}: ${viewed} of ${total} ${total === 1 ? "lesson" : "lessons"} viewed`,
  );
  const prerequisites = learner.prerequisites.map(
    ({ name, finished: done }) =>
      `${name}: ${done ? "finished" : "not finished"}`,
  );
  return [
    ...section("Finished droplets, newest first:", finished),
    ...section("In progress:", inProgress),
    ...section("This droplet's prerequisites:", prerequisites),
    ...section(
      "Lessons of this droplet already viewed:",
      learner.viewedLessons,
    ),
  ].join("\n");
}

/** The block's text, without its <learner> tags, within LEARNER_MAX_CHARS where dropping old droplets can do it */
export function learnerBlock(learner: LearnerContext): string {
  let { finished } = learner;
  let text = render(learner);
  while (text.length > LEARNER_MAX_CHARS && finished.length) {
    finished = finished.slice(0, -1);
    text = render({ ...learner, finished });
  }
  return text;
}

/** What the enrollment fetch returns for one row (see getLearnerEnrollments) */
export type LearnerEnrollment = {
  isComplete?: boolean | null;
  isArchived?: boolean | null;
  completionDate?: string | null;
  lastProgressDate?: string | null;
  updatedAt?: string | null;
  droplet?: {
    id: number;
    name: string;
    difficulty?: string | null;
    status?: string | null;
    isHidden?: boolean | null;
    tags?: { name: string }[] | null;
    lessons?: { id: number }[] | null;
  } | null;
  viewedLessons?: { id: number; name: string }[] | null;
};

/** The droplet Mentor is answering in */
export type LearnerCurrentDroplet = {
  id: number;
  prerequisites: {
    id: number;
    name: string;
    status?: string | null;
    isHidden?: boolean | null;
  }[];
};

const NAME_MAX = 60;
const PREREQUISITES_MAX = 8;
const FINISHED_MAX = 15;
const IN_PROGRESS_MAX = 5;
const VIEWED_MAX = 15;

const cut = (text: string) =>
  text.length > NAME_MAX ? `${text.slice(0, NAME_MAX - 1).trimEnd()}…` : text;

// Fails closed: a droplet whose flags are missing counts as hidden
const visible = (d: { status?: string | null; isHidden?: boolean | null }) =>
  d.status === "published" && d.isHidden === false;

/** The first date that parses, as a timestamp and a Boston "YYYY-MM" month */
function firstDate(...values: (string | null | undefined)[]) {
  for (const value of values) {
    const time = value ? Date.parse(value) : NaN;
    if (Number.isNaN(time)) continue;
    const month = localDate(new Date(time), DEFAULT_STREAK_TIME_ZONE).slice(
      0,
      7,
    );
    return { time, month };
  }
  return null;
}

/**
 * Maps the student's enrollments to the block's inputs. Only published,
 * visible droplets appear. Finished = isComplete (archived ones too);
 * in progress = not complete, not archived, with a viewed lesson still in
 * the droplet. Names and counts are bounded so the block fits its cap.
 */
export function toLearnerContext(
  rows: LearnerEnrollment[],
  current: LearnerCurrentDroplet,
): LearnerContext {
  const shown = rows.filter((r) => r.droplet && visible(r.droplet));
  const finishedIds = new Set<number>();
  const finished: (LearnerContext["finished"][number] & { time: number })[] =
    [];
  const progress: (LearnerContext["inProgress"][number] & { time: number })[] =
    [];

  for (const row of shown) {
    const droplet = row.droplet!;
    const lessonIds = new Set((droplet.lessons ?? []).map((l) => l.id));
    const viewed = (row.viewedLessons ?? []).filter((l) => lessonIds.has(l.id));
    if (row.isComplete) {
      finishedIds.add(droplet.id);
      const date = firstDate(
        row.completionDate,
        row.lastProgressDate,
        row.updatedAt,
      );
      if (!date) continue;
      finished.push({
        name: cut(droplet.name),
        tags: (droplet.tags ?? []).map((t) => cut(t.name)),
        difficulty: droplet.difficulty ?? null,
        month: date.month,
        time: date.time,
      });
    } else if (!row.isArchived && viewed.length) {
      const date = firstDate(row.lastProgressDate, row.updatedAt);
      progress.push({
        name: cut(droplet.name),
        viewed: viewed.length,
        total: lessonIds.size,
        time: date?.time ?? 0,
      });
    }
  }

  const here = shown.find((r) => r.droplet!.id === current.id);
  const hereLessons = new Set((here?.droplet?.lessons ?? []).map((l) => l.id));
  const newest = <T extends { time: number }>(a: T, b: T) => b.time - a.time;
  return {
    finished: finished
      .sort(newest)
      .slice(0, FINISHED_MAX)
      .map(({ time: _, ...rest }) => rest),
    inProgress: progress
      .sort(newest)
      .slice(0, IN_PROGRESS_MAX)
      .map(({ time: _, ...rest }) => rest),
    prerequisites: current.prerequisites
      .filter(visible)
      .slice(0, PREREQUISITES_MAX)
      .map((p) => ({ name: cut(p.name), finished: finishedIds.has(p.id) })),
    viewedLessons: (here?.viewedLessons ?? [])
      .filter((l) => hereLessons.has(l.id))
      .slice(0, VIEWED_MAX)
      .map((l) => cut(l.name)),
  };
}
