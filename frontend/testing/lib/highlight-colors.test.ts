import { displayColor } from "@/lib/highlight-colors";

describe("displayColor", () => {
  it.each([
    ["#fff300", "#fef08a"],
    ["#f9a8d4", "#f9a8d4"],
    ["#fbd38d", "#fbd38d"],
    ["#86efac", "#86efac"],
    ["#93c5fd", "#93c5fd"],
    ["#fef08a", "#fef08a"],
  ])("draws %s as %s", (saved, drawn) => {
    expect(displayColor(saved)).toBe(drawn);
  });
});
