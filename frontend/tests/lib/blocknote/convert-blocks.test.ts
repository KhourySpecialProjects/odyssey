import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

describe("convertBlockNoteToV1Blocks - image block", () => {
  it("converts image to a generic block with img tag", () => {
    const blocks = [
      {
        id: "test-img-1",
        type: "image",
        props: {
          url: "https://cdn.example.com/photo.jpg",
          name: "Test photo",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);

    expect(result).toHaveLength(1);
    expect(result[0].__component).toBe("droplets.generic");

    const generic = result[0] as any;
    expect(generic.content).toContain("<img");
    expect(generic.content).toContain("https://cdn.example.com/photo.jpg");
  });

  it("does not emit slideLayout properties on images", () => {
    const blocks = [
      {
        id: "test-img-2",
        type: "image",
        props: {
          url: "https://cdn.example.com/photo.jpg",
          name: "Photo",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBeUndefined();
    expect(generic.slideLayoutImageUrl).toBeUndefined();
  });
});

describe("convertBlockNoteToV1Blocks - indented (tabbed) children", () => {
  it("renders indented paragraph children inside the parent paragraph", () => {
    const blocks = [
      {
        id: "parent-para",
        type: "paragraph",
        content: [{ type: "text", text: "Parent text" }],
        children: [
          {
            id: "child-para",
            type: "paragraph",
            content: [{ type: "text", text: "Indented child" }],
            children: [],
          },
        ],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    expect(result).toHaveLength(1);
    const generic = result[0] as any;
    expect(generic.content).toContain("Parent text");
    expect(generic.content).toContain("Indented child");
    expect(generic.content).toContain("border-l");
  });

  it("renders indented heading children inside the parent heading", () => {
    const blocks = [
      {
        id: "h1",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Section" }],
        children: [
          {
            id: "h1-child",
            type: "paragraph",
            content: [{ type: "text", text: "Nested under heading" }],
            children: [],
          },
        ],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.content).toContain("<h2>Section</h2>");
    expect(generic.content).toContain("Nested under heading");
    expect(generic.content).toContain("border-l");
  });

  it("renders nested indents recursively", () => {
    const blocks = [
      {
        id: "p",
        type: "paragraph",
        content: [{ type: "text", text: "Level 0" }],
        children: [
          {
            id: "p-c1",
            type: "paragraph",
            content: [{ type: "text", text: "Level 1" }],
            children: [
              {
                id: "p-c2",
                type: "paragraph",
                content: [{ type: "text", text: "Level 2" }],
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const content = (result[0] as any).content;
    expect(content).toContain("Level 0");
    expect(content).toContain("Level 1");
    expect(content).toContain("Level 2");
    const borderMatches = content.match(/border-l/g) ?? [];
    expect(borderMatches.length).toBeGreaterThanOrEqual(2);
  });
});
