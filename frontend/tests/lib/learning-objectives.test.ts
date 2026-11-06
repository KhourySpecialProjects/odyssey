import { splitPastedObjectives } from "@/lib/learning-objectives";

describe("splitPastedObjectives", () => {
  it("splits one objective per line", () => {
    expect(splitPastedObjectives("Learn React\nMaster TypeScript")).toEqual([
      "Learn React",
      "Master TypeScript",
    ]);
  });

  it("strips bullet markers", () => {
    expect(splitPastedObjectives("- One\n* Two\n• Three\n– Four")).toEqual([
      "One",
      "Two",
      "Three",
      "Four",
    ]);
  });

  it("strips numbering", () => {
    expect(splitPastedObjectives("1. One\n2) Two\n10. Three")).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("keeps text that only looks like a marker without whitespace", () => {
    expect(splitPastedObjectives("-5 degrees\n3.14 is pi\n*bold*")).toEqual([
      "-5 degrees",
      "3.14 is pi",
      "*bold*",
    ]);
  });

  it("handles CRLF and CR line endings", () => {
    expect(splitPastedObjectives("One\r\nTwo\rThree")).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("skips blank and marker-only lines and trims", () => {
    expect(splitPastedObjectives("  One  \n\n   \n- \n  Two\n")).toEqual([
      "One",
      "Two",
    ]);
  });

  it("drops duplicates within the paste", () => {
    expect(splitPastedObjectives("One\n- One\nTwo")).toEqual(["One", "Two"]);
  });

  it("returns a single objective for a single line", () => {
    expect(splitPastedObjectives("Just one")).toEqual(["Just one"]);
  });

  it("returns an empty list for empty input", () => {
    expect(splitPastedObjectives("")).toEqual([]);
  });
});
