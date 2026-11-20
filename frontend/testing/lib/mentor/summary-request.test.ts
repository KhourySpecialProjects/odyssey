import { resolveMentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext } from "@/lib/mentor/context";
import { buildMentorRequest } from "@/lib/mentor/prompt";
import {
  isSummaryRequest,
  SUMMARY_MESSAGE,
  summaryRequest,
} from "@/lib/mentor/summary-request";
import { STARTERS } from "@/components/droplets/lessons/mentor/mentor-sheet";
import {
  blockNoteLesson,
  classicLesson,
  mentorDroplet,
} from "@/testing/mocks/mentorLessonMock";

describe("isSummaryRequest", () => {
  it.each([
    "summarise",
    "Summarize this lesson",
    "Summarize this lesson please",
    "can you give me a quick summary?",
    "tl;dr",
    "could you sum it up",
    "please summarise the whole page",
    "I want to get a summary of this lesson",
    "summarize this for me",
    "sum it all up",
    "summarize it",
  ])("accepts %j", (message) => {
    expect(isSummaryRequest(message)).toBe(true);
  });

  it.each(["summarize it", "sum it up", "summarize this", "sum it all up"])(
    "refuses %j mid-chat, where it points at the last answer",
    (message) => {
      expect(isSummaryRequest(message, { hasHistory: true })).toBe(false);
    },
  );

  it.each(["summarize this lesson", "summarise", "quick summary"])(
    "still accepts %j mid-chat",
    (message) => {
      expect(isSummaryRequest(message, { hasHistory: true })).toBe(true);
    },
  );

  it.each([
    "summarize the part about recursion",
    "summarise this in Spanish",
    "summarise what we talked about",
    "summarize and quiz me",
    "sumarize",
    "summarize lesson 3",
    "summary of the previous lesson",
    "don't summarize",
    "what is a summary",
    "",
  ])("refuses %j", (message) => {
    expect(isSummaryRequest(message)).toBe(false);
  });

  it("accepts the sheet's first starter, so renaming it can't stop the caching", () => {
    expect(isSummaryRequest(STARTERS[0])).toBe(true);
    expect(STARTERS[0]).toBe(SUMMARY_MESSAGE);
  });
});

describe("summaryRequest", () => {
  it.each([
    ["classic", classicLesson()],
    ["BlockNote", blockNoteLesson()],
  ])("is what the eval's Summarize seed builds (%s lesson)", (_, lesson) => {
    const context = buildLessonContext(lesson, mentorDroplet);
    const resolved = resolveMentorAsk(lesson, context, {
      kind: "lesson",
      message: "Summarize this lesson",
    });
    if (!resolved.ok) throw new Error(resolved.error);

    const request = summaryRequest(context);

    expect(request).toEqual(buildMentorRequest(context, resolved.ask));
    expect(JSON.stringify(request.messages)).not.toContain("<learner>");
  });
});
