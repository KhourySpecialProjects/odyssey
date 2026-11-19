import { tagsToTopics } from "@/lib/onboarding-topics";
import {
  areasStepSchema,
  goalStepSchema,
  onboardingAnswersSchema,
  profileStepSchema,
  topicsStepSchema,
} from "@/lib/validations/onboarding";

const valid = {
  firstName: "A",
  lastName: "B",
  timeZone: "America/New_York",
  goal: "class",
  focusAreas: ["technical"],
  interestTagIds: [1],
};
const profile = { firstName: "A", lastName: "B", timeZone: "Asia/Tokyo" };

describe("onboarding schemas", () => {
  it.each([
    [profileStepSchema, { ...profile, firstName: " " }, false],
    [profileStepSchema, { ...profile, lastName: "" }, false],
    [profileStepSchema, { ...profile, timeZone: "Mars/Base" }, false],
    [profileStepSchema, { ...profile, bio: "x".repeat(401) }, false],
    [profileStepSchema, { ...profile, bio: "x".repeat(400) }, true],
    [profileStepSchema, profile, true],
    [goalStepSchema, { goal: "other" }, false],
    [goalStepSchema, { goal: "browsing" }, true],
    [areasStepSchema, { focusAreas: [] }, false],
    [areasStepSchema, { focusAreas: ["personal"] }, true],
    [topicsStepSchema, { interestTagIds: [] }, false],
    [topicsStepSchema, { interestTagIds: ["t1"] }, false],
    [
      topicsStepSchema,
      { interestTagIds: Array.from({ length: 31 }, (_, i) => i + 1) },
      false,
    ],
    [
      topicsStepSchema,
      { interestTagIds: [1], interestNote: "x".repeat(201) },
      false,
    ],
    [topicsStepSchema, { interestTagIds: [1], interestNote: "SQL" }, true],
    [onboardingAnswersSchema, valid, true],
    [onboardingAnswersSchema, { ...valid, goal: undefined }, false],
  ])("%#", (schema, input, ok) => {
    expect(schema.safeParse(input).success).toBe(ok);
  });
});

describe("tagsToTopics", () => {
  it("maps known tags to areas, keeps ids and drops unmapped ones", () => {
    expect(
      tagsToTopics([
        { id: 7, documentId: "a", name: "  Git & Version Control " },
        { id: 8, documentId: "b", name: "Nope" },
      ]),
    ).toEqual([
      {
        id: 7,
        documentId: "a",
        name: "  Git & Version Control ",
        area: "technical",
      },
    ]);
  });

  it("maps the live tag names Git and Cybersecurity", () => {
    expect(
      tagsToTopics([
        { id: 1, documentId: "g", name: "Git" },
        { id: 2, documentId: "c", name: "Cybersecurity" },
      ]).map((t) => t.area),
    ).toEqual(["technical", "technical"]);
  });
});
