import type Anthropic from "@anthropic-ai/sdk";
import { buildMentorRequest, type MentorSetup } from "@/lib/mentor/prompt";
import { factsFor, type CaseFacts } from "./cases";
import type { EvalCase, Fixtures } from "./files";
import { cannedReply, type AnswerMode, type Status } from "./grade";
import type { ErrorRow } from "./metrics";

// What a run of Mentor's eval (ODY-885) will send, built with the route's
// own code: resolveMentorAsk, then buildMentorRequest.

export const SETUPS = {
  "haiku-low": { model: "claude-haiku-5-5", effort: "low" },
  "haiku-medium": { model: "claude-haiku-5-5", effort: "medium" },
  "sonnet-low": { model: "claude-sonnet-5-5", effort: "low" },
  "sonnet-medium": { model: "claude-sonnet-5-5", effort: "medium" },
} satisfies Record<string, MentorSetup>;
export type SetupName = keyof typeof SETUPS;

export function parseSetups(names: string[] = []): SetupName[] {
  const known = Object.keys(SETUPS);
  for (const name of names)
    if (!known.includes(name))
      throw new Error(`Unknown setup ${name}: use ${known.join(", ")}`);
  return (names.length ? [...new Set(names)] : known) as SetupName[];
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

/** --pilot: the first case of each kind in each format, in file order */
export function pilotCases(cases: EvalCase[]): EvalCase[] {
  const seen = new Set<string>();
  return cases.filter((c) => {
    const key = `${c.kind} ${c.format}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
