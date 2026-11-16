import { tagsToTopics } from "@/lib/onboarding-topics";
import {
  areasStepSchema,
  goalStepSchema,
  onboardingAnswersSchema,
  profileStepSchema,
  topicsStepSchema,
} from "@/lib/validations/onboarding";

const valid = {
  first: "A",
  last: "B",
  timeZone: "America/New_York",
  goal: "class",
  focusAreas: ["technical"],
  interests: ["t1"],
};

describe("onboarding schemas", () => {
  it.each([
    [
      profileStepSchema,
      { first: " ", last: "B", timeZone: "America/New_York" },
      false,
    ],
    [
      profileStepSchema,
      { first: "A", last: "B", timeZone: "Mars/Base" },
      false,
    ],
    [
      profileStepSchema,
      { first: "A", last: "B", timeZone: "Asia/Tokyo" },
      true,
    ],
    [goalStepSchema, { goal: "other" }, false],
    [goalStepSchema, { goal: "browsing" }, true],
    [areasStepSchema, { focusAreas: [] }, false],
    [areasStepSchema, { focusAreas: ["personal"] }, true],
    [topicsStepSchema, { interests: [] }, false],
    [topicsStepSchema, { interests: ["t1"], interestNote: "SQL" }, true],
    [onboardingAnswersSchema, valid, true],
    [onboardingAnswersSchema, { ...valid, goal: undefined }, false],
  ])("%#", (schema, input, ok) => {
    expect(schema.safeParse(input).success).toBe(ok);
  });
});

describe("tagsToTopics", () => {
  it("maps known tags to areas and drops unmapped ones", () => {
    expect(
      tagsToTopics([
        { documentId: "a", name: "  Git & Version Control " },
        { documentId: "b", name: "Nope" },
      ]),
    ).toEqual([
      { documentId: "a", name: "  Git & Version Control ", area: "technical" },
    ]);
  });

  it("maps the live tag names Git and Cybersecurity", () => {
    expect(
      tagsToTopics([
        { documentId: "g", name: "Git" },
        { documentId: "c", name: "Cybersecurity" },
      ]).map((t) => t.area),
    ).toEqual(["technical", "technical"]);
  });
});
