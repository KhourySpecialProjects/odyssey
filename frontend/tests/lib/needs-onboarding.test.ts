import { INTRO_DROPLET_ID, needsOnboarding, splitName } from "@/lib/onboarding";

const enr = (id: number, isComplete: boolean) =>
  ({ isComplete, droplet: { id } }) as never;

describe("needsOnboarding", () => {
  it.each([
    ["new user, no enrollments", {}, [], true],
    [
      "only the welcome droplet complete",
      {},
      [enr(INTRO_DROPLET_ID, true)],
      true,
    ],
    ["an incomplete other droplet", {}, [enr(7, false)], true],
    ["a completed other droplet", {}, [enr(7, true)], false],
    ["onboardedAt set", { onboardedAt: "2026-11-01T00:00:00Z" }, [], false],
  ])("%s", (_name, user, enrollments, expected) => {
    expect(needsOnboarding(user, enrollments)).toBe(expected);
  });
});

describe("splitName", () => {
  it.each([
    ["Zeng, Jaylen", { firstName: "Jaylen", lastName: "Zeng" }],
    ["Jaylen Zeng", { firstName: "Jaylen", lastName: "Zeng" }],
    [null, {}],
  ])("%s", (name, expected) => {
    expect(splitName(name)).toEqual(expected);
  });
});
