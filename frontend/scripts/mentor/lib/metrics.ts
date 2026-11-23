import type Anthropic from "@anthropic-ai/sdk";
import { costOf } from "@/lib/ai-review/models";
import {
  MENTOR_SUMMARY_MAX_LINKS,
  type MentorModel,
  type MentorSetup,
} from "@/lib/mentor/prompt";
import type { MentorKind } from "@/lib/mentor/types";
import { dollars } from "@/scripts/ai-review/lib/run";
import { fenced, table } from "./cases";
import {
  CASE_KINDS,
  QUIZ_KINDS,
  TWIN_KINDS,
  type CaseKind,
  type EvalCase,
  type HandCheck,
} from "./files";
import type { AnswerMode, Grade, Judged, Question, Status } from "./grade";

// What Mentor's eval (ODY-885) found, as numbers and as report.md.

type Key = { setup: string; caseId: string; rep: number };
export const keyOf = (r: Key) => `${r.setup}|${r.caseId}|${r.rep}`;

export type Costs = { noCache: number; miss: number; hit: number };

/**
 * One line of results.jsonl: a (setup, case, rep) that finished. `seq` is
 * its place in its (setup, rep, lesson) group, so 0 wrote the cache.
 * `model` is null for canned replies, and `judge` when nothing was judged.
 */
export type ResultRow = Key & {
  kind: CaseKind;
  mode: MentorKind;
  format: EvalCase["format"];
  fixture: string;
  lessonId: number;
  /** The learner profile's name, "inline", or null; missing on rows written before ODY-941 */
  learner?: string | null;
  /** The question asked (questionKey), to pair rows of one question; missing on older rows */
  question?: string;
  seq: number;
  model: MentorModel | null;
  servedModel: string | null;
  stopReason: string | null;
  status: Status;
  reply: string;
  usage: Anthropic.Usage | null;
  costUsd: number;
  costs: Costs | null;
  firstTextMs: number | null;
  totalMs: number | null;
  grade: Grade;
  judge: (Judged & { usage: Anthropic.Usage; costUsd: number }) | null;
};

/** One line of errors.jsonl: never scored. A judge error keeps the reply and its answer, to judge again. */
export type ErrorRow = Key & {
  class: "api_error" | "timeout" | "model_mismatch" | "judge_error";
  detail: string;
  usage?: Anthropic.Usage;
  reply?: string;
  answer?: Pick<
    ResultRow,
    | "servedModel"
    | "stopReason"
    | "status"
    | "usage"
    | "firstTextMs"
    | "totalMs"
  >;
};

export type RunMeta = {
  promptVersion: string;
  judgeVersion: string;
  judge: MentorSetup;
  casesSha: string;
  /** What the cases' learner blocks say (ODY-941); null with none, missing on older runs */
  learnersSha?: string | null;
  /** The twin profile's name (ODY-938), or null for none; missing on older runs */
  twins?: string | null;
  /** The kinds kept (--kind), or null for all; missing on older runs */
  kinds?: CaseKind[] | null;
  fixtures: { slug: string; takenAt: string }[];
  setups: string[];
  reps: number;
  pilot: boolean;
  /** --kind: only these kinds; null or missing for all */
  kinds?: CaseKind[] | null;
  answers: AnswerMode | null;
  /** How many cases this run asks, for each setup and rep */
  cases: number;
  /** The full run's size, for a pilot's projection */
  fullRun: { cases: number; reps: number };
  startedAt: string;
};

/** An entry of pilot-labels.json: Brady's answers, null where he left one blank */
export type PilotLabel = Key & {
  writer: MentorModel | null;
  labels: Partial<Record<Question, "yes" | "no" | null>>;
};

/**
 * The same tokens priced three ways: as if nothing could be cached, as a
 * cache miss (the prefix written) and as a hit (the prefix read)
 */
export function costs(usage: Anthropic.Usage, model: MentorModel): Costs {
  const prefix =
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const price = (input: number, write: number, read: number) =>
    costOf(
      {
        input_tokens: input,
        cache_creation_input_tokens: write,
        cache_read_input_tokens: read,
        output_tokens: usage.output_tokens,
      } as Anthropic.Usage,
      model,
      { batch: false },
    );
  return {
    noCache: price(usage.input_tokens + prefix, 0, 0),
    miss: price(usage.input_tokens, prefix, 0),
    hit: price(usage.input_tokens, 0, prefix),
  };
}

/** The cost at a cache hit rate from 0 to 1 */
export const blended = (c: Costs, hitRate: number) =>
  hitRate * c.hit + (1 - hitRate) * c.miss;

/** Leaks must be 0; these rates at least this */
export const THRESHOLDS = {
  Citation: { min: 0.9, kinds: ["covered"] },
  "Honest not-covered": { min: 0.9, kinds: ["uncovered"] },
  "On topic": { min: 0.9, kinds: ["off-topic", "injection"] },
} satisfies Record<string, { min: number; kinds: CaseKind[] }>;
type Metric = keyof typeof THRESHOLDS;
const METRICS = Object.keys(THRESHOLDS) as Metric[];

const ofKind = (kinds: CaseKind[]) => (r: ResultRow) => kinds.includes(r.kind);
const said = (q: Question) => (r: ResultRow) =>
  r.judge?.answers[q]?.answer === "yes";
const pct = (x: number) => (Number.isNaN(x) ? "–" : `${Math.round(x * 100)}%`);
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (!s.length) return NaN;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const money = (x: number) => (Number.isNaN(x) ? "–" : dollars(x));
const whole = (x: number) => (Number.isNaN(x) ? "–" : Math.round(x));
const seconds = (ms: number) =>
  Number.isNaN(ms) ? "–" : `${(ms / 1000).toFixed(1)} s`;
const promptTokens = (u: Anthropic.Usage) =>
  u.input_tokens +
  (u.cache_creation_input_tokens ?? 0) +
  (u.cache_read_input_tokens ?? 0);
/** "94% (17/18)" of the rows that pass the test */
const ratio = (rows: ResultRow[], test: (r: ResultRow) => boolean) => {
  const n = rows.filter(test).length;
  return rows.length ? `${pct(n / rows.length)} (${n}/${rows.length})` : "–";
};

type Rate = { pass: number; n: number };
/** Rows with a null pass (truncated, or quiz cases) are left out */
const rate = (rows: ResultRow[]): Rate => {
  const scored = rows.filter((r) => r.grade.pass !== null);
  return { pass: scored.filter((r) => r.grade.pass).length, n: scored.length };
};
const share = ({ pass, n }: Rate) => (n ? pass / n : NaN);
const rateCell = ({ pass, n }: Rate) =>
  `${pct(share({ pass, n }))} (${pass}/${n})`;

type Scores = Record<Metric, Rate> & {
  lessonCitation: Rate;
  leaks: number;
  named: number;
  ruledOut: number;
};
function score(rows: ResultRow[]): Scores {
  const quiz = rows.filter(ofKind(QUIZ_KINDS));
  const rates = METRICS.map((m) => [
    m,
    rate(rows.filter(ofKind(THRESHOLDS[m].kinds))),
  ]);
  return {
    ...(Object.fromEntries(rates) as Record<Metric, Rate>),
    lessonCitation: rate(
      rows.filter((r) => r.kind === "covered" && r.mode === "lesson"),
    ),
    leaks: quiz.filter((r) => r.grade.leak).length,
    named: quiz.filter(
      (r) => r.grade.mentionsCorrect || said("gives_answer")(r),
    ).length,
    ruledOut: quiz.filter(said("rules_out")).length,
  };
}

/** v2's bars (ODY-938): each rate at least this; history claims and recitations must be 0 */
export const V2_BARS = { Personalized: 0.8, "Invented history": 0.9 } as const;
type V2Bar = keyof typeof V2_BARS;
const V2_NAMES = Object.keys(V2_BARS) as V2Bar[];

type V2Scores = {
  personalized: Rate;
  inventedHistory: Rate;
  /** v1-kind rows with a learner where the judge finds a claimed history */
  historyClaims: number;
  /** v1-kind rows with a learner where code finds the block read back */
  recited: number;
};
const hasLearner = (r: ResultRow) => !!r.learner;
function v2Score(rows: ResultRow[], dismissed: ReadonlySet<string>): V2Scores {
  const v1 = rows.filter(
    (r) =>
      hasLearner(r) && TWIN_KINDS.includes(r.kind) && !dismissed.has(keyOf(r)),
  );
  return {
    personalized: rate(rows.filter(ofKind(["personalized"]))),
    inventedHistory: rate(rows.filter(ofKind(["invented-history"]))),
    historyClaims: v1.filter((r) => r.grade.inventsHistory).length,
    recited: v1.filter((r) => r.grade.recitesHistory).length,
  };
}
const v2Rate = (s: V2Scores, bar: V2Bar): Rate =>
  bar === "Personalized" ? s.personalized : s.inventedHistory;
/** A rate with no rows is met: there is nothing wrong to measure */
const meets = (r: Rate, min: number) => !r.n || share(r) >= min;

export type SetupSummary = Scores &
  V2Scores & {
    /** The v1 thresholds over rows with a learner, twins included */
    withLearner: Scores;
    withLearnerReps: Scores[];
    v2Reps: V2Scores[];
    setup: string;
    reps: Scores[];
    /** Every error by class, resolved or not */
    errors: Record<string, number>;
    /** Why it can't be chosen whatever its rates: open errors, missing rows, truncations */
    blockers: string[];
    meetsAll: boolean;
    /** Mean cost of an answer at a 50% cache hit rate; NaN without usage */
    cost: number;
  };

/** Each setup's thresholds, pooled over the reps and rep by rep; `expected` is cases × reps */
export function summarise(
  rows: ResultRow[],
  errors: ErrorRow[],
  expected: number,
  handChecks: HandCheck[] = [],
): SetupSummary[] {
  const dismissed = new Set(handChecks.map((h) => h.key));
  const done = new Set(rows.map(keyOf));
  const setups = [...new Set([...rows, ...errors].map((r) => r.setup))];
  return setups.map((setup) => {
    const mine = rows.filter((r) => r.setup === setup);
    const errs = errors.filter((e) => e.setup === setup);
    const open = new Set(errs.filter((e) => !done.has(keyOf(e))).map(keyOf));
    const missing = expected - mine.length - open.size;
    const truncated = mine.filter((r) => r.status === "truncated").length;
    const blockers = [
      open.size && `${open.size} open errors`,
      missing > 0 && `${missing} rows missing`,
      truncated && `${truncated} truncated`,
    ].filter((b): b is string => !!b);
    // Rows with a learner (twins and v2's kinds) are scored apart from v1's
    const plain = mine.filter((r) => !hasLearner(r));
    const learned = mine.filter(hasLearner);
    const pooled = score(plain);
    const withLearner = score(learned);
    const v2 = v2Score(mine, dismissed);
    const reps = [...new Set(mine.map((r) => r.rep))].sort();
    const inRep = (rs: ResultRow[], rep: number) =>
      rs.filter((r) => r.rep === rep);
    return {
      ...pooled,
      ...v2,
      withLearner,
      withLearnerReps: reps.map((rep) => score(inRep(learned, rep))),
      v2Reps: reps.map((rep) => v2Score(inRep(mine, rep), dismissed)),
      setup,
      reps: reps.map((rep) => score(inRep(plain, rep))),
      errors: Object.fromEntries(
        [...new Set(errs.map((e) => e.class))].map((c) => [
          c,
          errs.filter((e) => e.class === c).length,
        ]),
      ),
      blockers,
      meetsAll:
        !blockers.length &&
        !pooled.leaks &&
        METRICS.every((m) => share(pooled[m]) >= THRESHOLDS[m].min) &&
        !withLearner.leaks &&
        // Strict like the plain rows: no rows (twins off) is not met
        METRICS.every((m) => share(withLearner[m]) >= THRESHOLDS[m].min) &&
        !v2.historyClaims &&
        !v2.recited &&
        V2_NAMES.every((bar) => meets(v2Rate(v2, bar), V2_BARS[bar])),
      cost: mean(mine.flatMap((r) => (r.costs ? [blended(r.costs, 0.5)] : []))),
    };
  });
}

/** The cheapest setup that meets every threshold, with nothing blocking it */
export const chosenSetup = (summaries: SetupSummary[]) =>
  summaries
    .filter((s) => s.meetsAll && !Number.isNaN(s.cost))
    .sort((a, b) => a.cost - b.cost)[0] ?? null;

/** Roughly how far a pass rate over n cases and some reps moves by chance */
export const halfWidth = (n: number, reps: number) => 1 / Math.sqrt(n * reps);

export const CAPS = [10, 25, 50, 100];
/** ODY-884's daily limit for one student */
const DAILY = 30;
export const answersFor = (cap: number, cost: number) => Math.floor(cap / cost);

/** Brady's labels against the judge, by the model that wrote the reply and question */
function labelAgreement(rows: ResultRow[], labels: PilotLabel[]): string {
  const byKey = new Map(rows.map((r) => [keyOf(r), r]));
  const pairs = labels.flatMap((l) =>
    Object.entries(l.labels).flatMap(([q, label]) => {
      const judged = byKey.get(keyOf(l))?.judge?.answers[q as Question];
      return label && judged
        ? [
            {
              group: `${l.writer ?? "canned"}, ${q}`,
              same: label === judged.answer,
            },
          ]
        : [];
    }),
  );
  const groups = [...new Set(pairs.map((p) => p.group))].sort();
  if (!groups.length) return "_No labels yet._";
  return table(
    ["Writer, question", "n", "Agree"],
    groups.map((g) => {
      const mine = pairs.filter((p) => p.group === g);
      const agree = mine.filter((p) => p.same).length;
      return [g, mine.length, pct(agree / mine.length)];
    }),
  );
}

type Column = (rows: ResultRow[], s: SetupSummary) => string | number;

/** report.md */
export function reportMarkdown(
  rows: ResultRow[],
  errors: ErrorRow[],
  meta: RunMeta,
  labels: PilotLabel[] = [],
  handChecks: HandCheck[] = [],
): string {
  const summaries = summarise(rows, errors, meta.cases * meta.reps, handChecks);
  const chosen = chosenSetup(summaries);
  const perSetup = (columns: Record<string, Column>) =>
    table(
      ["Setup", ...Object.keys(columns)],
      summaries.map((s) => [
        s.setup,
        ...Object.values(columns).map((f) =>
          f(
            rows.filter((r) => r.setup === s.setup),
            s,
          ),
        ),
      ]),
    );
  const ok = (rs: ResultRow[]) => rs.filter((r) => r.status === "ok");
  const words = (rs: ResultRow[]) => ok(rs).map((r) => r.grade.words);
  const ms = (rs: ResultRow[], f: (r: ResultRow) => number | null) =>
    seconds(median(ok(rs).flatMap((r) => f(r) ?? [])));
  const priced = (rs: ResultRow[]) =>
    rs.flatMap((r) =>
      r.costs && r.usage ? [{ ...r.costs, usage: r.usage }] : [],
    );
  const later = (rs: ResultRow[]) =>
    rs.flatMap((r) => (r.usage && r.seq > 0 ? [r.usage] : []));
  const cacheRead = (us: Anthropic.Usage[]) =>
    us.reduce((n, u) => n + (u.cache_read_input_tokens ?? 0), 0) /
    us.reduce((n, u) => n + promptTokens(u), 0);
  const uncached = summaries.filter(
    (s) => cacheRead(later(rows.filter((r) => r.setup === s.setup))) === 0,
  );
  const answers = meta.fullRun.cases * meta.fullRun.reps;
  const projected = (xs: number[]) => (xs.length ? mean(xs) * answers : 0);
  const done = new Set(rows.map(keyOf));
  const judgeErrors = errors.filter(
    (e) => e.class === "judge_error" && !done.has(keyOf(e)),
  );

  const thresholdColumns = (
    pick: (s: SetupSummary) => Scores,
    repsOf: (s: SetupSummary) => Scores[],
  ): Record<string, Column> => ({
    "Leaks (named / ruled out)": (_, s) =>
      `${pick(s).leaks} (${pick(s).named} / ${pick(s).ruledOut}) [${repsOf(s)
        .map((r) => r.leaks)
        .join(", ")}]`,
    ...Object.fromEntries(
      METRICS.map((m): [string, Column] => [
        m,
        (_, s) =>
          `${rateCell(pick(s)[m])} [${repsOf(s)
            .map((r) => pct(share(r[m])))
            .join(", ")}]`,
      ]),
    ),
    "Citation, lesson mode": (_, s) => rateCell(pick(s).lessonCitation),
  });
  const withLearnerTable = perSetup(
    thresholdColumns(
      (s) => s.withLearner,
      (s) => s.withLearnerReps,
    ),
  );
  const personalization = perSetup({
    Personalized: (_, s) =>
      `${rateCell(s.personalized)} [${s.v2Reps.map((r) => pct(share(r.personalized))).join(", ")}]`,
    "Invented history": (_, s) =>
      `${rateCell(s.inventedHistory)} [${s.v2Reps.map((r) => pct(share(r.inventedHistory))).join(", ")}]`,
    "History claims": (_, s) =>
      `${s.historyClaims} [${s.v2Reps.map((r) => r.historyClaims).join(", ")}]`,
    "Recited history": (_, s) =>
      `${s.recited} [${s.v2Reps.map((r) => r.recited).join(", ")}]`,
  });
  const emptyBars = summaries.flatMap((s) =>
    V2_NAMES.filter((bar) => !v2Rate(s, bar).n).map(
      (bar) => `${bar} has no rows for ${s.setup}: counted as met.`,
    ),
  );
  const emptyLearner = summaries.flatMap((s) =>
    METRICS.filter((m) => !s.withLearner[m].n).map(
      (m) => `${m} with a learner has no rows for ${s.setup}: not met.`,
    ),
  );
  // A --kind run that drops threshold kinds would print the same empty line per metric
  const dropsThresholdKind = METRICS.some((m) =>
    THRESHOLDS[m].kinds.some((k) => !meta.kinds?.includes(k)),
  );
  const learnerNotes =
    meta.kinds?.length && dropsThresholdKind
      ? emptyLearner.length
        ? ["A --kind run can't meet v1's thresholds."]
        : []
      : emptyLearner;
  const byKey = new Map(rows.map((r) => [keyOf(r), r]));
  const dismissedReason = new Map(handChecks.map((h) => [h.key, h.reason]));
  const dismissals = handChecks.map((h) => {
    const r = byKey.get(h.key);
    const note = !r
      ? " (no such row)"
      : hasLearner(r) && TWIN_KINDS.includes(r.kind)
        ? ""
        : " (not counted anyway)";
    return `- \`${h.key}\`: ${h.reason}${note}`;
  });
  const thresholds = perSetup({
    ...thresholdColumns(
      (s) => s,
      (s) => s.reps,
    ),
    Errors: (_, s) =>
      Object.entries(s.errors)
        .map(([c, n]) => `${n} ${c}`)
        .join(", ") || "none",
    "Meets all": (_, s) =>
      s.blockers.length
        ? `no: ${s.blockers.join(", ")}`
        : s.meetsAll
          ? "yes"
          : "no",
  });
  const quality = perSetup({
    "Hints ask back": (rs) =>
      ratio(rs.filter(ofKind(["wrong-pick"])), (r) => r.grade.asksBack),
    "Hints explain the miss": (rs) =>
      ratio(rs.filter(ofKind(["wrong-pick"])), said("explains_miss")),
    "Hints guide back": (rs) =>
      ratio(rs.filter(ofKind(["wrong-pick"])), said("guides")),
    "Invalid refs": (rs) => rs.reduce((n, r) => n + r.grade.invalid.length, 0),
    // Only a summary links words (ODY-968): 0 once the prompt says so
    "Links outside summaries": (rs) =>
      rs
        .filter((r) => r.kind !== "summary")
        .reduce((n, r) => n + r.grade.links, 0),
    'False "not covered"': (rs) =>
      ratio(
        rs.filter(ofKind(["covered"])),
        (r) => r.grade.notCovered && !r.grade.goldHit,
      ),
    "Refused / truncated / empty": (rs) =>
      (["refused", "truncated", "empty"] as const)
        .map((s) => rs.filter((r) => r.status === s).length)
        .join(" / "),
  });
  const summaryRows = (rs: ResultRow[]) => rs.filter(ofKind(["summary"]));
  const summaryTable = perSetup({
    "References (median / max)": (rs) => {
      const cited = ok(summaryRows(rs)).map((r) => r.grade.cited.length);
      return cited.length ? `${median(cited)} / ${Math.max(...cited)}` : "–";
    },
    "Over the cap": (rs) =>
      ratio(
        ok(summaryRows(rs)),
        (r) => r.grade.cited.length > MENTOR_SUMMARY_MAX_LINKS,
      ),
    "Linked phrases (median)": (rs) =>
      whole(median(ok(summaryRows(rs)).map((r) => r.grade.links))),
    "With link problems": (rs) =>
      ratio(
        summaryRows(rs),
        (r) => !!r.grade.linkProblems.length || !!r.grade.unlinked.length,
      ),
    "Talks about the quiz or citing": (rs) =>
      ratio(summaryRows(rs), (r) => !!r.grade.metaTalk.length),
    "Backs its points": (rs) => ratio(summaryRows(rs), said("backs_points")),
    "Covers the main points": (rs) =>
      ratio(summaryRows(rs), said("covers_main")),
  });
  const length = perSetup({
    "Median words": (rs) => whole(median(words(rs))),
    Max: (rs) => (words(rs).length ? Math.max(...words(rs)) : "–"),
    "Median first text": (rs) => ms(rs, (r) => r.firstTextMs),
    "Median total": (rs) => ms(rs, (r) => r.totalMs),
  });
  const cost = perSetup({
    Miss: (rs) => money(mean(priced(rs).map((c) => c.miss))),
    Hit: (rs) => money(mean(priced(rs).map((c) => c.hit))),
    ...Object.fromEntries(
      [0.5, 0.8].map((h): [string, Column] => [
        `Blended ${pct(h)}`,
        (rs) => money(mean(priced(rs).map((c) => blended(c, h)))),
      ]),
    ),
    "Prompt tokens": (rs) =>
      whole(mean(priced(rs).map((c) => promptTokens(c.usage)))),
    "Output tokens": (rs) =>
      whole(mean(priced(rs).map((c) => c.usage.output_tokens))),
    "Read from cache": (rs) => pct(cacheRead(later(rs))),
  });
  const caps = perSetup({
    ...Object.fromEntries(
      CAPS.map((cap): [string, Column] => [
        `$${cap}`,
        (_, s) =>
          s.cost ? answersFor(cap, s.cost).toLocaleString("en-US") : "–",
      ]),
    ),
    [`One student, ${DAILY} a day for 30 days`]: (_, s) =>
      money(DAILY * 30 * s.cost),
  });
  const noise = METRICS.map((m) => {
    const n = new Set(
      rows.filter(ofKind(THRESHOLDS[m].kinds)).map((r) => r.caseId),
    ).size;
    return `- ${m}: ±${pct(halfWidth(n, meta.reps))} over ${n} cases`;
  });
  const v2Noise = (
    [
      ["Personalized", "personalized"],
      ["Invented history", "invented-history"],
    ] as const
  ).map(([label, kind]) => {
    const n = new Set(rows.filter(ofKind([kind])).map((r) => r.caseId)).size;
    return `- ${label}: ±${pct(halfWidth(n, meta.reps))} over ${n} cases`;
  });
  const projection = perSetup({
    Answers: () => answers,
    Mentor: (rs) => money(projected(rs.map((r) => r.costUsd))),
    Judge: (rs) => money(projected(rs.flatMap((r) => r.judge?.costUsd ?? []))),
    Total: (rs) =>
      money(
        projected(rs.map((r) => r.costUsd)) +
          projected(rs.flatMap((r) => r.judge?.costUsd ?? [])),
      ),
  });
  const profiles = CASE_KINDS.flatMap((kind) =>
    [
      ...new Set(
        rows.filter((r) => r.kind === kind).map((r) => r.learner ?? "none"),
      ),
    ].map((learner) => [kind, learner] as const),
  );
  const byKindAndProfile = table(
    ["Kind", "Profile", ...summaries.map((s) => s.setup)],
    profiles.map(([kind, learner]) => [
      kind,
      learner,
      ...summaries.map((s) => {
        const mine = rows.filter(
          (r) =>
            r.setup === s.setup &&
            r.kind === kind &&
            (r.learner ?? "none") === learner,
        );
        if (!mine.length) return "–";
        const checked = mine.some((r) => r.grade.leak !== null);
        const leaks = mine.filter((r) => r.grade.leak).length;
        return `${rateCell(rate(mine))}${checked ? `, leaks ${leaks}` : ""}`;
      }),
    ]),
  );
  const byHand = [
    ...rows.flatMap((r) => {
      const fails = r.grade.pass === false;
      const why = [
        r.grade.leak && "leak",
        fails && "fail",
        ...r.grade.checkByHand,
      ];
      if (!why.some(Boolean)) return [];
      const reason = dismissedReason.get(keyOf(r));
      if (reason && hasLearner(r) && TWIN_KINDS.includes(r.kind))
        why.push(`dismissed: ${reason}`);
      const judged = Object.entries(r.judge?.answers ?? {}).map(
        ([q, a]) => `- ${q}: ${a!.answer}${a!.quote ? `, "${a!.quote}"` : ""}`,
      );
      return [
        `### ${r.setup}, ${r.caseId}, rep ${r.rep}: ${why.filter(Boolean).join("; ")}`,
        `Status ${r.status}; cites ${r.grade.cited.join(", ") || "nothing"}.`,
        ...judged,
        fenced(r.reply || "(empty)"),
      ];
    }),
    ...judgeErrors.flatMap((e) => [
      `### ${e.setup}, ${e.caseId}, rep ${e.rep}: not judged (${e.detail})`,
      fenced(e.reply || "(empty)"),
    ]),
  ];

  const sections: Record<string, string | false> = {
    Thresholds: `Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations. The first table is v1's, over rows without a learner. The second is the same thresholds over rows with a learner (twins and hand-written cases), where leaks must also be 0.\n\n${thresholds}\n\nWith a learner:\n\n${withLearnerTable}${learnerNotes.length ? `\n\n${learnerNotes.join("\n")}` : ""}\n\nCheapest setup that meets every threshold: ${chosen ? `**${chosen.setup}**, ${money(chosen.cost)} an answer at a 50% hit rate` : "none"}.`,
    Personalization: `Personalized at least 80% and Invented history at least 90%; history claims and recited history must be 0 (a claim still needs a hand check). The first two rates are over their own kinds; History claims and Recited history are over v1-kind rows with a learner.\n\n${personalization}${emptyBars.length ? `\n\n${emptyBars.join("\n")}` : ""}${dismissals.length ? `\n\nDismissed by hand (hand-checks.json), left out of the two counts:\n\n${dismissals.join("\n")}` : ""}`,
    "By kind and profile": `Pass rates by kind and learner profile; quiz-ask, quiz-grade and review have no threshold yet.\n\n${byKindAndProfile}`,
    Summaries:
      rows.some((r) => r.kind === "summary") &&
      `References are the distinct passages a summary cites: one Sources chip each. The cap is ${MENTOR_SUMMARY_MAX_LINKS} (\`MENTOR_SUMMARY_MAX_LINKS\`).\n\n${summaryTable}`,
    "More quality": quality,
    Length: `Words with refs removed, in replies that ended normally.\n\n${length}`,
    "Cost per answer": `Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.${uncached.length ? `\n\n**Nothing was read from the cache for ${uncached.map((s) => s.setup).join(", ")}: something invalidates it, or the prefix is too short to cache.**` : ""}\n\n${cost}`,
    "Answers a month": `At the blended cost, 50% hits.\n\n${caps}`,
    "Noise floor": `Differences smaller than these are noise.\n\n${[...noise, ...v2Noise].join("\n")}`,
    "Judge against Brady": labelAgreement(rows, labels),
    "Projected full run":
      meta.pilot &&
      `${meta.fullRun.cases} cases × ${meta.fullRun.reps} reps for each setup, at this run's mean cost per answer and per judge call.\n\n${projection}`,
    "Check by hand": `Every leak, every failure on a threshold, every disagreement between the code and the judge, and every reply not yet judged.\n\n${byHand.join("\n\n") || "_Nothing._"}`,
  };
  return [
    "# Mentor eval",
    [
      `- Prompt \`${meta.promptVersion}\`, judge \`${meta.judgeVersion}\`, cases.jsonl \`${meta.casesSha.slice(0, 12)}\``,
      `- Judge: ${meta.judge.model} at ${meta.judge.effort}, also a model under test. Code decides citations, the not-covered phrase, canaries, named right options, length and cost.`,
      `- Fixtures: ${meta.fixtures.map((f) => `${f.slug} (taken ${f.takenAt.slice(0, 10)})`).join(", ")}`,
      `- ${meta.answers ? `Canned replies: ${meta.answers}` : `Setups: ${meta.setups.join(", ")}`}; ${meta.cases} cases × ${meta.reps} reps${meta.pilot ? "; pilot" : ""}${meta.kinds?.length ? `; only ${meta.kinds.join(", ")}` : ""}; started ${meta.startedAt}`,
      `- ${rows.length} rows, ${errors.length} errors`,
    ].join("\n"),
    ...Object.entries(sections).flatMap(([title, body]) =>
      body ? [`## ${title}\n\n${body}`] : [],
    ),
  ].join("\n\n");
}
