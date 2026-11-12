import type Anthropic from "@anthropic-ai/sdk";
import { costOf } from "@/lib/ai-review/models";
import type { MentorModel, MentorSetup } from "@/lib/mentor/prompt";
import type { MentorKind } from "@/lib/mentor/types";
import { dollars } from "@/scripts/ai-review/lib/run";
import { fenced, table } from "./cases";
import { QUIZ_KINDS, type CaseKind, type EvalCase } from "./files";
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
  fixtures: { slug: string; takenAt: string }[];
  setups: string[];
  reps: number;
  pilot: boolean;
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
export const pct = (x: number) =>
  Number.isNaN(x) ? "–" : `${Math.round(x * 100)}%`;
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const median = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN;
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

export type SetupSummary = Scores & {
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
): SetupSummary[] {
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
    const pooled = score(mine);
    const reps = [...new Set(mine.map((r) => r.rep))].sort();
    return {
      ...pooled,
      setup,
      reps: reps.map((rep) => score(mine.filter((r) => r.rep === rep))),
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
        METRICS.every((m) => share(pooled[m]) >= THRESHOLDS[m].min),
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
): string {
  const summaries = summarise(rows, errors, meta.cases * meta.reps);
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

  const thresholds = perSetup({
    "Leaks (named / ruled out)": (_, s) =>
      `${s.leaks} (${s.named} / ${s.ruledOut}) [${s.reps.map((r) => r.leaks).join(", ")}]`,
    ...Object.fromEntries(
      METRICS.map((m): [string, Column] => [
        m,
        (_, s) =>
          `${rateCell(s[m])} [${s.reps.map((r) => pct(share(r[m]))).join(", ")}]`,
      ]),
    ),
    "Citation, lesson mode": (_, s) => rateCell(s.lessonCitation),
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
    "Invalid refs": (rs) => rs.reduce((n, r) => n + r.grade.invalid.length, 0),
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
  const byHand = [
    ...rows.flatMap((r) => {
      const fails = r.grade.pass === false;
      const why = [
        r.grade.leak && "leak",
        fails && "fail",
        ...r.grade.checkByHand,
      ];
      if (!why.some(Boolean)) return [];
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
    Thresholds: `Pooled over the reps, each rep in brackets. Leaks must be 0 and each rate at least 90%, with no open errors, missing rows or truncations.\n\n${thresholds}\n\nCheapest setup that meets every threshold: ${chosen ? `**${chosen.setup}**, ${money(chosen.cost)} an answer at a 50% hit rate` : "none"}.`,
    "More quality": quality,
    Length: `Words with refs removed, in replies that ended normally.\n\n${length}`,
    "Cost per answer": `Each answer's tokens priced as a cache miss (the lesson written to the cache) and as a hit (read from it). "Read from cache" is the share of prompt tokens read from the cache after a lesson's first request.${uncached.length ? `\n\n**Nothing was read from the cache for ${uncached.map((s) => s.setup).join(", ")}: something invalidates it, or the prefix is too short to cache.**` : ""}\n\n${cost}`,
    "Answers a month": `At the blended cost, 50% hits.\n\n${caps}`,
    "Noise floor": `Differences smaller than these are noise.\n\n${noise.join("\n")}`,
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
      `- ${meta.answers ? `Canned replies: ${meta.answers}` : `Setups: ${meta.setups.join(", ")}`}; ${meta.cases} cases × ${meta.reps} reps${meta.pilot ? "; pilot" : ""}; started ${meta.startedAt}`,
      `- ${rows.length} rows, ${errors.length} errors`,
    ].join("\n"),
    ...Object.entries(sections).flatMap(([title, body]) =>
      body ? [`## ${title}\n\n${body}`] : [],
    ),
  ].join("\n\n");
}
