import { REASONS } from "@/lib/recommendations/reasons";
import type {
  Droplet,
  FocusArea,
  Recommendation,
  RecommendationRule,
  RecommendedDroplet,
} from "@/types";

export type CandidateDroplet = RecommendedDroplet & {
  prerequisites?: { id: number }[];
};
export type LearningPath = {
  rule: "next-in-voyage" | "next-in-playlist";
  name: string;
  dropletIds: number[];
};
export type StudentState = {
  userId: number;
  enrolledIds: Set<number>;
  finished: { id: number; name: string; at: number }[];
  paths: LearningPath[];
  interests: { id: number; name: string }[];
  focusAreas: FocusArea[];
  dismissedIds: Set<number>;
};
/** Source droplet id to the droplets finished alongside it, with student counts. */
export type CoCompletion = Map<number, { id: number; count: number }[]>;
/** Droplet id to its distinct finishers (the backend only sends 3 or more). */
export type CompletionCounts = Map<number, number>;
export type RankInput = {
  candidates: CandidateDroplet[];
  student: StudentState;
  excludeIds: number[];
  coCompletion?: CoCompletion;
  completions?: CompletionCounts;
};
type Pick = { id: number; rule: RecommendationRule; reason: string };
export type Rule = (
  eligible: Map<number, CandidateDroplet>,
  input: RankInput,
) => Pick[];

/** Narrows a fetched droplet; null without a documentId. Typed, so field drift fails tsc. */
export function toRecommended(
  d: Droplet | RecommendedDroplet,
): RecommendedDroplet | null {
  if (!d.documentId) return null;
  return {
    id: d.id,
    documentId: d.documentId,
    name: d.name,
    slug: d.slug,
    type: d.type,
    focusArea: d.focusArea,
    difficulty: d.difficulty,
    description: d.description,
    averageRating: d.averageRating,
    tags: d.tags,
    lessons: d.lessons,
    authorized_users: d.authorized_users,
  };
}

const rating = (d: CandidateDroplet) => d.averageRating ?? 0;

/** Rating desc, then name asc, then id asc. Plain comparison, so CI and prod agree. */
function byRating(a: CandidateDroplet, b: CandidateDroplet): number {
  if (rating(a) !== rating(b)) return rating(b) - rating(a);
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id - b.id;
}

function buildEligible({
  candidates,
  student,
  excludeIds,
}: RankInput): Map<number, CandidateDroplet> {
  const skip = new Set(excludeIds);
  const eligible = new Map<number, CandidateDroplet>();
  for (const d of candidates) {
    if (
      !d.documentId ||
      student.enrolledIds.has(d.id) ||
      student.dismissedIds.has(d.id) ||
      skip.has(d.id) ||
      d.authorized_users?.some((u) => u.id === student.userId)
    )
      continue;
    eligible.set(d.id, d);
  }
  return eligible;
}

/** Rule 5: most finished first (0 when unknown), then the shared tie-break. */
const popular: Rule = (eligible, { completions }) => {
  const finishes = (d: CandidateDroplet) => completions?.get(d.id) ?? 0;
  const reason = (d: CandidateDroplet) => {
    if (finishes(d) > 0) return REASONS.popular;
    return rating(d) > 0 ? REASONS.topRated : REASONS.unrated;
  };
  return [...eligible.values()]
    .sort((a, b) => finishes(b) - finishes(a) || byRating(a, b))
    .map((d) => ({ id: d.id, rule: "popular", reason: reason(d) }));
};

export type VoyageNodeInput = {
  id: number;
  orderIndex: number;
  isMainPath: boolean;
  branchType: "required" | "optional";
  nodeType: "playlist" | "droplet";
  droplet?: { id: number } | null;
  playlist?: { droplets?: { id: number }[] } | null;
  parentNode?: { id: number } | null;
};

const byOrder = (a: VoyageNodeInput, b: VoyageNodeInput) =>
  a.orderIndex - b.orderIndex || a.id - b.id;

const nodeIds = (n: VoyageNodeInput): number[] =>
  n.nodeType === "playlist"
    ? (n.playlist?.droplets ?? []).map((d) => d.id)
    : n.droplet
      ? [n.droplet.id]
      : [];

/** A voyage's droplet ids in path order: main nodes, each followed by its required branches. */
export function voyageDropletIds(nodes: VoyageNodeInput[]): number[] {
  const out: number[] = [];
  for (const main of nodes.filter((n) => n.isMainPath).sort(byOrder)) {
    const branches = nodes
      .filter(
        (n) =>
          !n.isMainPath &&
          n.branchType === "required" &&
          n.parentNode?.id === main.id,
      )
      .sort(byOrder);
    for (const node of [main, ...branches]) out.push(...nodeIds(node));
  }
  return [...new Set(out)];
}

export const MAX_PATH_PICKS = 2;

/** Rule 1: the first unfinished droplet of each path, unless the student already has it. */
const nextInPath: Rule = (eligible, { candidates, student }) => {
  const live = new Set(candidates.map((d) => d.id));
  const finished = new Set(student.finished.map((f) => f.id));
  const picks = new Map<number, Pick>();
  for (const path of student.paths) {
    for (const id of path.dropletIds) {
      if (finished.has(id)) continue;
      if (live.has(id) && student.enrolledIds.has(id)) break;
      if (!eligible.has(id)) continue;
      if (!picks.has(id))
        picks.set(id, {
          id,
          rule: path.rule,
          reason:
            path.rule === "next-in-voyage"
              ? REASONS.voyage(path.name)
              : REASONS.playlist(path.name),
        });
      break;
    }
  }
  return [...picks.values()].slice(0, MAX_PATH_PICKS);
};

/** Rule 2: droplets that build on one the student finished, newest finish first. */
const postrequisite: Rule = (eligible, { student }) =>
  [...eligible.values()]
    .flatMap((d) => {
      const prereqs = new Set(d.prerequisites?.map((p) => p.id));
      const source = student.finished.find((f) => prereqs.has(f.id));
      return source ? [{ d, source }] : [];
    })
    .sort((a, b) => b.source.at - a.source.at || byRating(a.d, b.d))
    .map(({ d, source }) => ({
      id: d.id,
      rule: "postrequisite" as const,
      reason: REASONS.postrequisite(source.name),
    }));

export const MAX_CO_COMPLETION_PICKS = 2;

/** Rule 3: eligible droplets finished by others who finished one of yours, most popular first. */
const coCompletion: Rule = (eligible, { student, coCompletion: pairs }) => {
  if (!pairs?.size) return [];
  const best = new Map<
    number,
    { count: number; source: StudentState["finished"][number] }
  >();
  for (const source of student.finished) {
    for (const { id, count } of pairs.get(source.id) ?? []) {
      if (!eligible.has(id)) continue;
      if (count > (best.get(id)?.count ?? 0)) best.set(id, { count, source });
    }
  }
  return [...best]
    .map(([id, pick]) => ({ d: eligible.get(id)!, ...pick }))
    .sort(
      (a, b) =>
        b.count - a.count || b.source.at - a.source.at || byRating(a.d, b.d),
    )
    .slice(0, MAX_CO_COMPLETION_PICKS)
    .map(({ d, source }) => ({
      id: d.id,
      rule: "co-completion" as const,
      reason: REASONS.coCompletion(source.name),
    }));
};

/** Rule 4: quiz tag matches first, then focus-only matches (when 1 or 2 areas are chosen). */
const interest: Rule = (eligible, { student }) => {
  const wanted = new Set(student.interests.map((i) => i.id));
  const focusCounts = student.focusAreas.length < 3;
  return [...eligible.values()]
    .flatMap((d) => {
      const matches = (d.tags ?? []).filter((t) => wanted.has(t.id)).length;
      const focus = focusCounts && student.focusAreas.includes(d.focusArea);
      return matches > 0 || focus ? [{ d, matches }] : [];
    })
    .sort((a, b) => b.matches - a.matches || byRating(a.d, b.d))
    .map(({ d }) => {
      const tagIds = new Set((d.tags ?? []).map((t) => t.id));
      const first = student.interests.find((i) => tagIds.has(i.id));
      return {
        id: d.id,
        rule: "interest" as const,
        reason: first
          ? REASONS.interest(first.name)
          : REASONS.focus(d.focusArea),
      };
    });
};

export const RULES: Rule[] = [
  nextInPath,
  postrequisite,
  coCompletion,
  interest,
  popular,
];

export function rankRecommendations(
  input: RankInput,
  limit: number,
  rules: Rule[] = RULES,
): Recommendation[] {
  const eligible = buildEligible(input);
  // Picked droplets leave `remaining`, so a later rule's cap isn't spent on them.
  const remaining = new Map(eligible);
  const seen = new Set<number>();
  const out: Recommendation[] = [];
  for (const rule of rules) {
    for (const pick of rule(remaining, input)) {
      const candidate = eligible.get(pick.id);
      if (!candidate || seen.has(pick.id)) continue;
      seen.add(pick.id);
      remaining.delete(pick.id);
      const droplet = toRecommended(candidate);
      if (droplet) out.push({ droplet, reason: pick.reason, rule: pick.rule });
    }
  }
  return out.slice(0, limit);
}
