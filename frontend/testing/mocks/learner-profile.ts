import type { LearnerProfile } from "@/types";

/** A flat LearnerProfile, as getLearnerProfile returns it */
export function learnerProfileData(
  overrides: Partial<LearnerProfile> = {},
): LearnerProfile {
  return {
    id: 1,
    documentId: "doc1",
    goal: "career",
    focusAreas: ["technical"],
    interests: [{ id: 3, name: "Testing", slug: "testing" }],
    interestNote: null,
    ...overrides,
  };
}
