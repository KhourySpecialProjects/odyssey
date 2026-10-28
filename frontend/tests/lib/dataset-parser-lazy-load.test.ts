/**
 * papaparse and xlsx-js-style are loaded on demand. These mocks make those
 * imports fail the way a lazy chunk does after a network drop or a deploy,
 * so the parsers' error messages can be checked. (dataset-parser.test.ts
 * covers parsing itself with working mocks.)
 */
jest.mock(
  "papaparse",
  () => {
    throw new Error("Loading chunk 4821 failed.");
  },
  { virtual: true },
);

jest.mock("xlsx-js-style", () => {
  throw new Error("Loading chunk 9377 failed.");
});

import { parseCSV, parseExcel } from "@/lib/dataset-parser";

describe("dataset parser support failing to load", () => {
  it("tells the user CSV support couldn't load and to try again", async () => {
    const file = new File(["name,score\nAlice,95"], "data.csv", {
      type: "text/csv",
    });

    await expect(parseCSV(file)).rejects.toThrow(
      "Failed to load CSV support. Please try again.",
    );
  });

  it("tells the user Excel support couldn't load and to try again", async () => {
    const file = new File(["x"], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await expect(parseExcel(file)).rejects.toThrow(
      "Failed to load Excel support. Please try again.",
    );
  });
});
