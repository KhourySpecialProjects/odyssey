import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { costOf } from "@/lib/ai-review/models";
import type { MentorModel } from "@/lib/mentor/prompt";
import type { CaseFacts } from "./cases";
import { appendJsonl, readJsonl } from "./files";
import {
  ASKED,
  gradeRow,
  JUDGE,
  judgeRequest,
  parseJudge,
  textOf,
  type Judged,
  type Status,
} from "./grade";
import {
  costs,
  keyOf,
  type ErrorRow,
  type ResultRow,
  type RunMeta,
} from "./metrics";
import type { Answered, Planned } from "./plan";

// Sends Mentor's eval (ODY-885): each answer streamed as the route will
// stream it, then judged, then written down. Failures go to errors.jsonl,
// never into a score.

export const RESULTS = "results.jsonl";
export const ERRORS = "errors.jsonl";
/** The longest one answer may take */
export const TIMEOUT_MS = 120_000;
const GROUPS_AT_ONCE = 4;

const TRUNCATED: Anthropic.StopReason[] = [
  "max_tokens",
  "model_context_window_exceeded",
];
const statusOf = (message: Anthropic.Message): Status =>
  message.stop_reason === "refusal"
    ? "refused"
    : TRUNCATED.includes(message.stop_reason!)
      ? "truncated"
      : textOf(message).trim()
        ? "ok"
        : "empty";

/** The judge's answers and cost, or why there are none */
export async function judgeOnce(
  client: Anthropic,
  reply: string,
  facts: CaseFacts,
): Promise<
  | { ok: true; judged: Judged; usage: Anthropic.Usage; costUsd: number }
  | { ok: false; detail: string }
> {
  try {
    const message = await client.messages.create(judgeRequest(reply, facts), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!message.model.startsWith(JUDGE.model))
      return { ok: false, detail: `the judge was served by ${message.model}` };
    const parsed = parseJudge(message, reply, facts.case.kind);
    if (!parsed.ok) return parsed;
    const { answers, badQuotes } = parsed;
    const costUsd = costOf(message.usage, JUDGE.model, { batch: false });
    return {
      ok: true,
      judged: { answers, badQuotes },
      usage: message.usage,
      costUsd,
    };
  } catch (err) {
    if (!(err instanceof Anthropic.AnthropicError)) throw err;
    return { ok: false, detail: String(err) };
  }
}

/**
 * Mentor's reply to a job, streamed as the route streams it and timed to
 * its first text, or the error line it failed with
 */
async function answer(
  client: Anthropic,
  job: Planned,
  timeoutMs: number,
): Promise<Answered | Omit<ErrorRow, "setup" | "caseId" | "rep">> {
  if (job.saved || !job.params) return job.saved!;
  const { params } = job;
  const signal = AbortSignal.timeout(timeoutMs);
  const started = Date.now();
  let firstTextMs: number | null = null;
  try {
    const stream = client.messages.stream(params, { signal });
    stream.on("text", () => {
      firstTextMs ??= Date.now() - started;
    });
    const message = await stream.finalMessage();
    if (!message.model.startsWith(params.model)) {
      const detail = `asked for ${params.model}, served ${message.model}`;
      return { class: "model_mismatch", detail, usage: message.usage };
    }
    return {
      reply: textOf(message),
      status: statusOf(message),
      servedModel: message.model,
      stopReason: message.stop_reason,
      usage: message.usage,
      firstTextMs,
      totalMs: Date.now() - started,
    };
  } catch (err) {
    if (!(err instanceof Anthropic.AnthropicError)) throw err;
    const timedOut =
      signal.aborted || err instanceof Anthropic.APIConnectionTimeoutError;
    return { class: timedOut ? "timeout" : "api_error", detail: String(err) };
  }
}

/** Answers, judges and writes one job; returns its status or error class */
async function runOne(
  client: Anthropic,
  job: Planned,
  dir: string,
  timeoutMs: number,
) {
  const { facts, setup, rep, seq } = job;
  const key = { setup, caseId: facts.case.id, rep };
  const answered = await answer(client, job, timeoutMs);
  const failed = (e: Omit<ErrorRow, keyof typeof key>) => {
    appendJsonl(path.join(dir, ERRORS), { ...key, ...e });
    return e.class;
  };
  if ("class" in answered) return failed(answered);
  const { reply, ...said } = answered;
  const judge =
    reply.trim() && ASKED[facts.case.kind].length
      ? await judgeOnce(client, reply, facts)
      : null;
  if (judge && !judge.ok) {
    // Kept, so a resume judges this reply again rather than asking anew
    return failed({
      class: "judge_error",
      detail: judge.detail,
      reply,
      answer: said,
    });
  }

  const model = (job.params?.model as MentorModel | undefined) ?? null;
  const usage = model ? said.usage : null;
  const row: ResultRow = {
    ...key,
    kind: facts.case.kind,
    mode: facts.case.input.kind,
    format: facts.case.format,
    fixture: facts.case.fixture,
    lessonId: facts.case.lessonId,
    seq,
    model,
    ...said,
    reply,
    costUsd: usage ? costOf(usage, model!, { batch: false }) : 0,
    costs: usage ? costs(usage, model!) : null,
    grade: gradeRow(reply, said.status, facts, judge?.judged ?? null),
    judge: judge && {
      ...judge.judged,
      usage: judge.usage,
      costUsd: judge.costUsd,
    },
  };
  appendJsonl(path.join(dir, RESULTS), row);
  return said.status;
}

/**
 * The groups without the rows already written, for --resume. A reply the
 * judge failed on is kept on its job, to be judged again, not asked again.
 */
export function pending(groups: Planned[][], dir: string): Planned[][] {
  const done = new Set(
    readJsonl<ResultRow>(path.join(dir, RESULTS)).map(keyOf),
  );
  const saved = new Map(
    readJsonl<ErrorRow>(path.join(dir, ERRORS)).flatMap((e) =>
      e.class === "judge_error" && e.answer
        ? [[keyOf(e), { ...e.answer, reply: e.reply ?? "" }]]
        : [],
    ),
  );
  return groups
    .map((g) =>
      g.flatMap((job) => {
        const key = keyOf({ ...job, caseId: job.facts.case.id });
        return done.has(key)
          ? []
          : [{ ...job, saved: saved.get(key) ?? job.saved }];
      }),
    )
    .filter((g) => g.length);
}

/** Why a run can't be resumed: anything it was graded against has changed */
export function resumeProblems(
  then: RunMeta,
  now: Pick<
    RunMeta,
    "casesSha" | "promptVersion" | "judgeVersion" | "fixtures"
  >,
): string[] {
  const fixtures = (m: Pick<RunMeta, "fixtures">) =>
    JSON.stringify(m.fixtures.map((f) => [f.slug, f.takenAt]));
  return [
    then.casesSha !== now.casesSha && "cases.jsonl",
    then.promptVersion !== now.promptVersion && "MENTOR_PROMPT_VERSION",
    then.judgeVersion !== now.judgeVersion && "JUDGE_VERSION",
    fixtures(then) !== fixtures(now) && "the fixtures",
  ].filter((p): p is string => !!p);
}

/** Runs 4 groups at a time, each group in order, writing each row as it finishes */
export async function runGroups(
  client: Anthropic,
  groups: Planned[][],
  dir: string,
  timeoutMs = TIMEOUT_MS,
) {
  const total = groups.flat().length;
  let [next, finished] = [0, 0];
  const worker = async () => {
    while (next < groups.length) {
      for (const job of groups[next++]) {
        const outcome = await runOne(client, job, dir, timeoutMs);
        console.log(
          `  [${++finished}/${total}] ${job.setup} rep ${job.rep} ${job.facts.case.id}: ${outcome}`,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: GROUPS_AT_ONCE }, worker));
}
