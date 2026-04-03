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
