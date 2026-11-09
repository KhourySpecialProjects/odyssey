import type { z } from "zod";
import { mentorInputSchema } from "@/lib/validations/mentor";
import type { MentorInput, MentorTurn } from "@/lib/mentor/types";

const turns = (...roles: MentorTurn["role"][]) =>
  roles.map((role) => ({ role, text: `${role} turn` }));
/** Three exchanges at the longest each turn may be */
const longest = Array.from({ length: 6 }, (_, i) =>
  i % 2
    ? { role: "mentor", text: "m".repeat(2000) }
    : { role: "student", text: "s".repeat(1000) },
);
const withTurn = (i: number, text: string) =>
  longest.map((turn, j) => (j === i ? { ...turn, text } : turn));

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe("mentorInputSchema", () => {
  it("parses to exactly MentorInput", () => {
    const same: Same<z.output<typeof mentorInputSchema>, MentorInput> = true;
    expect(same).toBe(true);
  });

  it.each([
    [
      "every limit, exactly",
      { kind: "lesson", message: "x".repeat(1000), history: longest },
      { kind: "lesson", message: "x".repeat(1000), history: longest },
    ],
    [
      "the longest selection",
      { kind: "explain", selection: "x".repeat(300) },
      { kind: "explain", selection: "x".repeat(300) },
    ],
    [
      "a question, trimmed",
      { kind: "lesson", message: " What is a join? " },
      { kind: "lesson", message: "What is a join?" },
    ],
    [
      "a follow-up",
      {
        kind: "lesson",
        message: "And a left join?",
        history: turns("student", "mentor"),
      },
      {
        kind: "lesson",
        message: "And a left join?",
        history: turns("student", "mentor"),
      },
    ],
    [
      "a selection",
      { kind: "explain", selection: "LEFT JOIN" },
      { kind: "explain", selection: "LEFT JOIN" },
    ],
    [
      "a hint with the ids as strings, as the quiz sends them",
      { kind: "quiz-hint", questionId: "41", answerIds: ["413"] },
      { kind: "quiz-hint", questionId: 41, answerIds: [413] },
    ],
    [
      "lesson text and answers from the browser, dropped",
      { kind: "lesson", message: "Hi", lessonText: "x", isCorrect: true },
      { kind: "lesson", message: "Hi" },
    ],
  ])("accepts %s", (_, input, parsed) => {
    expect(mentorInputSchema.parse(input)).toEqual(parsed);
  });

  it.each([
    ["an empty message", { kind: "lesson", message: "  " }],
    [
      "a message over 1,000 characters",
      { kind: "lesson", message: "x".repeat(1001) },
    ],
    [
      "a selection over 300 characters",
      { kind: "explain", selection: "x".repeat(301) },
    ],
    [
      "more than 6 turns",
      {
        kind: "lesson",
        message: "Hi",
        history: turns(...Array(4).fill(["student", "mentor"]).flat()),
      },
    ],
    [
      "history that starts with Mentor",
      { kind: "lesson", message: "Hi", history: turns("mentor", "student") },
    ],
    [
      "two student turns in a row",
      { kind: "explain", selection: "x", history: turns("student", "student") },
    ],
    [
      "history that ends with the student",
      { kind: "lesson", message: "Hi", history: turns("student") },
    ],
    [
      "a student turn over 1,000 characters",
      { kind: "lesson", message: "Hi", history: withTurn(2, "s".repeat(1001)) },
    ],
    [
      "a reply over 2,000 characters",
      { kind: "lesson", message: "Hi", history: withTurn(3, "m".repeat(2001)) },
    ],
    [
      "a blank turn",
      { kind: "lesson", message: "Hi", history: withTurn(1, " ") },
    ],
    [
      "a hint with no pick",
      { kind: "quiz-hint", questionId: 41, answerIds: [] },
    ],
    [
      "more than 10 picks",
      { kind: "quiz-hint", questionId: 41, answerIds: Array(11).fill(1) },
    ],
    [
      "an id that isn't a number",
      { kind: "quiz-hint", questionId: 41, answerIds: [""] },
    ],
    ["an unknown kind", { kind: "chat", message: "Hi" }],
  ])("rejects %s", (_, input) => {
    expect(mentorInputSchema.safeParse(input).success).toBe(false);
  });
});
