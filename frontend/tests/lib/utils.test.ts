import { isTrueFalseQuestion, stripHtmlTags } from "@/lib/utils";

describe("stripHtmlTags", () => {
  it("strips simple HTML tags", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtmlTags("")).toBe("");
  });
});

describe("isTrueFalseQuestion", () => {
  it("returns true for plain 'True'/'False' answers", () => {
    const question = {
      answerOptions: [
        { content: "True" },
        { content: "False" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(true);
  });

  it("returns true when TipTap wraps values in <p> tags", () => {
    const question = {
      answerOptions: [
        { content: "<p>True</p>" },
        { content: "<p>False</p>" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(true);
  });

  it("returns true for lowercase 'true'/'false'", () => {
    const question = {
      answerOptions: [
        { content: "true" },
        { content: "false" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(true);
  });

  it("returns true when options are in swapped order (False first)", () => {
    const question = {
      answerOptions: [
        { content: "False" },
        { content: "True" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(true);
  });

  it("returns false for a three-option MCQ", () => {
    const question = {
      answerOptions: [
        { content: "A" },
        { content: "B" },
        { content: "C" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(false);
  });

  it("returns false for a two-option MCQ whose values are not true/false", () => {
    const question = {
      answerOptions: [
        { content: "Yes" },
        { content: "No" },
      ],
    };
    expect(isTrueFalseQuestion(question)).toBe(false);
  });

  it("returns false for an empty options array", () => {
    const question = { answerOptions: [] };
    expect(isTrueFalseQuestion(question)).toBe(false);
  });
});
