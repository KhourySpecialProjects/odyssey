import type Anthropic from "@anthropic-ai/sdk";
import { buildMentorRequest, type MentorSetup } from "@/lib/mentor/prompt";
import { factsFor, learnerTwins, type CaseFacts } from "./cases";
import { contrastJobs, contrastKey, requestFor, type Pair } from "./contrast";
import {
  CASE_KINDS,
  loadLearners,
  type CaseKind,
  type EvalCase,
  type Fixtures,
} from "./files";
import {
  cannedReply,
  judgeRequest,
  questionsFor,
  type AnswerMode,
  type Status,
} from "./grade";
import type { ErrorRow, ResultRow, RunMeta } from "./metrics";

// What a run of Mentor's eval (ODY-885) will send, built with the route's
// own code: resolveMentorAsk, then buildMentorRequest.

export const SETUPS = {
  "haiku-low": { model: "claude-haiku-5-5", effort: "low" },
  "haiku-medium": { model: "claude-haiku-5-5", effort: "medium" },
  "haiku-high": { model: "claude-haiku-5-5", effort: "high" },
  "sonnet-low": { model: "claude-sonnet-5-5", effort: "low" },
  "sonnet-medium": { model: "claude-sonnet-5-5", effort: "medium" },
  "sonnet-high": { model: "claude-sonnet-5-5", effort: "high" },
} satisfies Record<string, MentorSetup>;
export type SetupName = keyof typeof SETUPS;

export function parseSetups(names: string[] = []): SetupName[] {
  const known = Object.keys(SETUPS);
  for (const name of names)
    if (!known.includes(name))
      throw new Error(`Unknown setup ${name}: use ${known.join(", ")}`);
  return (names.length ? [...new Set(names)] : known) as SetupName[];
}

/** The twin profile (ODY-938) when --twins isn't given */
export const DEFAULT_TWINS = "broad-history";

/** --twins: a profile's name, or null for "none" */
export const parseTwins = (name = DEFAULT_TWINS) =>
  name === "none" ? null : name;

/** --kind, repeated: null with none given */
export function parseKinds(kinds: string[] = []): CaseKind[] | null {
  for (const kind of kinds)
    if (!(CASE_KINDS as readonly string[]).includes(kind))
      throw new Error(`Unknown kind ${kind}: use ${CASE_KINDS.join(", ")}`);
  return kinds.length ? [...new Set(kinds as CaseKind[])] : null;
}

/** A run's twins and kinds: the flags given, else those a resumed run started with (null for none or an old run) */
export function runSettings(
  values: { twins?: string; kind?: string[] },
  started: Pick<RunMeta, "twins" | "kinds"> | null,
): { twins: string | null; kinds: CaseKind[] | null } {
  return {
    twins: values.twins
      ? parseTwins(values.twins)
      : started
        ? started.twins ?? null
        : parseTwins(),
    kinds: values.kind?.length
      ? parseKinds(values.kind)
      : started
        ? started.kinds ?? null
        : null,
  };
}

/** The cases a run asks: every case, plus its twins, kept to the kinds given */
export function runCases(
  all: EvalCase[],
  twins: string | null,
  kinds: CaseKind[] | null,
  learners = loadLearners(),
): EvalCase[] {
  const pool = [...all, ...(twins ? learnerTwins(all, twins, learners) : [])];
  return kinds ? pool.filter((c) => kinds.includes(c.kind)) : pool;
}

/** A reply in hand: one the judge failed on, kept on its error line, or a canned one */
export type Answered = NonNullable<ErrorRow["answer"]> & { reply: string };

/**
 * One (setup, case, rep): a request to Mentor, or a reply in hand to grade
 * without asking Mentor
 */
export type Planned = {
  setup: string;
  rep: number;
  seq: number;
  facts: CaseFacts;
  params?: Anthropic.MessageCreateParamsNonStreaming;
  saved?: Answered;
};

export const FULL_REPS = 2;
/** About a 120-word reply, to estimate the judge's cost before there is one */
const PLACEHOLDER = "word ".repeat(150);

/**
 * What a run would send, for confirmSpend: each request to Mentor, and a
 * judge call wherever the case has questions. A reply in hand is judged
 * without a request to Mentor; otherwise the judge's is priced on a placeholder.
 */
export const pricedRequests = (groups: Planned[][]) =>
  groups.flat().flatMap((job) => {
    const reply = job.saved?.reply ?? PLACEHOLDER;
    const mentor = job.saved || !job.params ? [] : [job.params];
    const { case: c, learner } = job.facts;
    const judged = reply && questionsFor(c.kind, !!learner).length;
    return [
      ...mentor.map((params) => ({ params, outputTokens: 1000 })),
      ...(judged
        ? [{ params: judgeRequest(reply, job.facts), outputTokens: 2500 }]
        : []),
    ];
  });

/** The contrast calls a run would send, priced like the rest: each pair on each setup and rep, minus those in `done` */
export function pricedContrasts(
  pairs: Pair[],
  fixtures: Fixtures,
  runs: { setup: string; rep: number }[],
  oracle: boolean,
  done = new Set<string>(),
) {
  const facts = new Map(
    pairs
      .flatMap(({ a, b }) => [a, b])
      .map((c) => [c.id, factsFor(c, fixtures)]),
  );
  const rows = runs.flatMap(({ setup, rep }) =>
    pairs.flatMap(({ a, b }) =>
      [a, b].map(
        (c) => ({ setup, rep, caseId: c.id, reply: PLACEHOLDER }) as ResultRow,
      ),
    ),
  );
  return contrastJobs(pairs, rows, facts, oracle)
    .filter(
      (j) => !done.has(contrastKey({ ...j, a: j.pair.a.id, b: j.pair.b.id })),
    )
    .map((j) => ({ params: requestFor(j), outputTokens: 2500 }));
}

/** --pilot: the first case of each kind, format and twin, plus the pair partners of those first cases, in file order */
export function pilotCases(cases: EvalCase[]): EvalCase[] {
  const seen = new Set<string>();
  const first = cases.filter((c) => {
    const key = `${c.kind} ${c.format}${c.twinOf ? " twin" : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const firstIds = new Set(first.map((c) => c.id));
  const partners = new Set(
    first.flatMap((c) => (c.pairs ?? []).map((p) => p.with)),
  );
  // A kept B side brings its A side
  const aSides = cases.filter((c) =>
    c.pairs?.some((p) => firstIds.has(p.with)),
  );
  const kept = new Set([
    ...first,
    ...cases.filter((c) => partners.has(c.id)),
    ...aSides,
  ]);
  return cases.filter((c) => kept.has(c));
}

/**
 * One group per (setup, rep, lesson), each in file order: run in order,
 * the first request on a lesson writes the cache and the rest read it.
 * Throws on a case --check would have caught.
 */
export function planGroups(
  cases: EvalCase[],
  fixtures: Fixtures,
  setups: SetupName[],
  reps: number,
): Planned[][] {
  const facts = cases.map((c) => factsFor(c, fixtures));
  const lessonOf = (f: CaseFacts) => `${f.case.fixture}:${f.case.lessonId}`;
  const lessons = [...new Set(facts.map(lessonOf))];
  return setups.flatMap((setup) =>
    Array.from({ length: reps }, (_, i) =>
      lessons.map((lesson) =>
        facts
          .filter((f) => lessonOf(f) === lesson)
          .map((f, seq) => ({
            setup,
            rep: i + 1,
            seq,
            facts: f,
            params: buildMentorRequest(f.context, f.ask, SETUPS[setup], {
              learner: f.learner?.text,
            }),
          })),
      ),
    ).flat(),
  );
}

/** --answers: one canned reply per case, each its own group, for the judge alone */
export const cannedGroups = (
  cases: EvalCase[],
  fixtures: Fixtures,
  mode: AnswerMode,
): Planned[][] =>
  cases.map((c) => {
    const facts = factsFor(c, fixtures);
    const reply = cannedReply(mode, facts);
    const status: Status = reply ? "ok" : "empty";
    const none = { servedModel: null, stopReason: null, usage: null };
    const saved = { ...none, firstTextMs: null, totalMs: null, reply, status };
    return [{ setup: `answers-${mode}`, rep: 1, seq: 0, facts, saved }];
  });
