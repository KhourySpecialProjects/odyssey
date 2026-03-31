import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

describe("convertBlockNoteToV1Blocks - image layout", () => {
  it("emits slideLayout property for image-right layout", () => {
    const blocks = [
      {
        id: "test-img-1",
        type: "image",
        props: {
          url: "https://cdn.example.com/photo.jpg",
          name: "Test photo",
          layout: "image-right",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);

    expect(result).toHaveLength(1);
    expect(result[0].__component).toBe("droplets.generic");

    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("image-right");
    expect(generic.slideLayoutImageUrl).toBe(
      "https://cdn.example.com/photo.jpg",
    );
    expect(generic.content).toContain("<img");
    expect(generic.content).not.toContain("<!--LAYOUT:");
  });

  it("emits slideLayout property for image-left layout", () => {
    const blocks = [
      {
        id: "test-img-2",
        type: "image",
        props: {
          url: "https://cdn.example.com/left.jpg",
          name: "Left photo",
          layout: "image-left",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("image-left");
    expect(generic.slideLayoutImageUrl).toBe(
      "https://cdn.example.com/left.jpg",
    );
  });

  it("emits slideLayout property for full-image layout", () => {
    const blocks = [
      {
        id: "test-img-3",
        type: "image",
        props: {
          url: "https://cdn.example.com/full.jpg",
          name: "Full photo",
          layout: "full-image",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("full-image");
  });

  it("does NOT emit slideLayout for default layout images", () => {
    const blocks = [
      {
        id: "test-img-4",
        type: "image",
        props: {
          url: "https://cdn.example.com/default.jpg",
          name: "Default photo",
          layout: "default",
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
