import { bakeoffMarkdown, labelled } from "@/scripts/mentor/lib/bakeoff";
import type { PilotLabel, ResultRow } from "@/scripts/mentor/lib/metrics";

const label = (
  caseId: string,
  writer: PilotLabel["writer"],
  labels: PilotLabel["labels"],
): PilotLabel => ({ setup: "haiku-medium", caseId, rep: 1, writer, labels });

const labels = [
  label("a", "claude-haiku-5-5", { gives_answer: "no", rules_out: null }),
  label("b", "claude-sonnet-5-5", { gives_answer: "yes", rules_out: "no" }),
  label("c", "claude-sonnet-5-5", { gives_answer: null, rules_out: null }),
];

const judged = (
  candidate: string,
  caseId: string,
  gives: "yes" | "no",
  rules: "yes" | "no",
) => ({
  candidate,
  setup: "haiku-medium",
  caseId,
  rep: 1,
  answers: {
    gives_answer: { answer: gives, quote: `${candidate} on ${caseId}` },
    rules_out: { answer: rules, quote: "" },
  },
  costUsd: 0.01,
});

it("labelled keeps rows with a label and a reply", () => {
  const row = (caseId: string, reply: string) =>
    ({ setup: "haiku-medium", caseId, rep: 1, reply }) as ResultRow;

  expect(
    labelled([row("a", "Hi."), row("b", " "), row("c", "Hi.")], labels).map(
      (r) => r.caseId,
    ),
  ).toEqual(["a"]);
});

it("bakeoffMarkdown scores each judge against Brady, and lists the disagreements", () => {
  const text = bakeoffMarkdown(
    [
      judged("sonnet-medium", "a", "yes", "no"),
      judged("sonnet-medium", "b", "yes", "no"),
      judged("opus-medium", "a", "no", "yes"),
      judged("opus-medium", "b", "yes", "no"),
      judged("opus-medium", "c", "yes", "yes"),
    ],
    labels,
  );

  // a's rules_out and all of c are blank, so each judge has 3 pairs
  expect(text).toContain(
    "| sonnet-medium | 67% (2/3) | 50% (1/2) | 100% (1/1) | 0% (0/1) | 100% (2/2) | 0 | 0 | $0.02 |",
  );
  expect(text).toContain("| opus-medium | 100% (3/3) |");
  expect(text).toContain(
    '- sonnet-medium, haiku-medium a rep 1, gives_answer: Brady no, judge yes, "sonnet-medium on a"',
  );
  expect(text).not.toContain("opus-medium, haiku-medium");
});
