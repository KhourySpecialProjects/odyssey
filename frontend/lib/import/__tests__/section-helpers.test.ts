import {
  mergeSections,
  deleteSection,
  updateSectionTitle,
} from "../section-helpers";
import type { ImportSection } from "../types";

let uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: jest.fn(() => `uuid-${++uuidCounter}`),
}));

beforeEach(() => {
  uuidCounter = 0;
  jest.clearAllMocks();
});

function makeSection(
  id: string,
  title: string,
  markdownContent: string = "Content",
  sourceInfo: string = "Page 1",
): ImportSection {
  return { id, title, markdownContent, sourceInfo };
}

describe("mergeSections", () => {
  it("merges two adjacent sections", () => {
    const sections = [
      makeSection("a", "First", "Content A", "Pages 1-2"),
      makeSection("b", "Second", "Content B", "Pages 3-4"),
      makeSection("c", "Third", "Content C", "Page 5"),
    ];

    const result = mergeSections(sections, "a", "b");

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("First");
    expect(result[0].markdownContent).toBe("Content A\n\nContent B");
    expect(result[0].sourceInfo).toBe("Pages 1-4");
    expect(result[1].id).toBe("c");
  });

  it("merges sections with reversed id order (idB before idA)", () => {
    const sections = [
      makeSection("a", "First", "Content A"),
      makeSection("b", "Second", "Content B"),
    ];

    const result = mergeSections(sections, "b", "a");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("First");
    expect(result[0].markdownContent).toBe("Content A\n\nContent B");
  });

  it("returns original array if ids are not adjacent", () => {
    const sections = [
      makeSection("a", "First"),
      makeSection("b", "Second"),
      makeSection("c", "Third"),
    ];

    const result = mergeSections(sections, "a", "c");
    expect(result).toEqual(sections);
  });

  it("returns original array if either id is not found", () => {
    const sections = [makeSection("a", "First"), makeSection("b", "Second")];
    const result = mergeSections(sections, "a", "nonexistent");
    expect(result).toEqual(sections);
  });

  it("merges slide source infos correctly", () => {
    const sections = [
      makeSection("a", "First", "A", "Slide 3"),
      makeSection("b", "Second", "B", "Slide 4"),
    ];
    const result = mergeSections(sections, "a", "b");
    expect(result[0].sourceInfo).toBe("Slides 3-4");
  });

  it("merges same source info into single value", () => {
    const sections = [
      makeSection("a", "First", "A", "Slide 5"),
      makeSection("b", "Second", "B", "Slide 5"),
    ];
    const result = mergeSections(sections, "a", "b");
    expect(result[0].sourceInfo).toBe("Slide 5");
  });

  it("does not mutate the original array", () => {
    const sections = [makeSection("a", "A"), makeSection("b", "B")];
    const original = [...sections];
    mergeSections(sections, "a", "b");
    expect(sections).toEqual(original);
  });
});

describe("deleteSection", () => {
  it("removes a section by id", () => {
    const sections = [
      makeSection("a", "First"),
      makeSection("b", "Second"),
      makeSection("c", "Third"),
    ];

    const result = deleteSection(sections, "b");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("c");
  });

  it("prevents deleting the only remaining section", () => {
    const sections = [makeSection("a", "Only")];
    const result = deleteSection(sections, "a");
    expect(result).toEqual(sections);
    expect(result).toHaveLength(1);
  });

  it("returns original array if id not found", () => {
    const sections = [makeSection("a", "First"), makeSection("b", "Second")];
    const result = deleteSection(sections, "nonexistent");
    expect(result).toEqual(sections);
  });

  it("can delete the first section", () => {
    const sections = [makeSection("a", "First"), makeSection("b", "Second")];
    const result = deleteSection(sections, "a");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("can delete the last section", () => {
    const sections = [makeSection("a", "First"), makeSection("b", "Second")];
    const result = deleteSection(sections, "b");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("does not mutate the original array", () => {
    const sections = [makeSection("a", "A"), makeSection("b", "B")];
    const original = [...sections];
    deleteSection(sections, "a");
    expect(sections).toEqual(original);
  });
});

describe("updateSectionTitle", () => {
  it("updates the title of a section by id", () => {
    const sections = [makeSection("a", "Old Title"), makeSection("b", "Other")];

    const result = updateSectionTitle(sections, "a", "New Title");
    expect(result[0].title).toBe("New Title");
    expect(result[1].title).toBe("Other");
  });

  it("returns original array if id not found", () => {
    const sections = [makeSection("a", "Title")];
    const result = updateSectionTitle(sections, "nonexistent", "New");
    expect(result).toEqual(sections);
  });

  it("does not change other section properties", () => {
    const sections = [makeSection("a", "Old Title", "Some content", "Page 3")];
    const result = updateSectionTitle(sections, "a", "New Title");
    expect(result[0].markdownContent).toBe("Some content");
    expect(result[0].sourceInfo).toBe("Page 3");
    expect(result[0].id).toBe("a");
  });

  it("does not mutate the original array", () => {
    const sections = [makeSection("a", "Title")];
    const original = [...sections];
    updateSectionTitle(sections, "a", "New");
    expect(sections).toEqual(original);
  });
});
