import { tagSpace } from "@/components/draft/review/comment-tag";

const rect = (left: number, right: number) =>
  ({
    left,
    right,
    top: 0,
    bottom: 0,
    width: right - left,
    height: 0,
  }) as DOMRect;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("tagSpace", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true,
    });
  });

  it("measures to the window with no reviewer panel", () => {
    const space = tagSpace(rect(160, 1000), rect(160, 1000));

    expect(space.room).toBe(Math.min(240, 1280 - 16 - (160 + 858)));
    expect(space.tagMode).toBe("full");
  });

  it("measures the content column when the panel takes the right of main", () => {
    const main = document.createElement("main");
    main.dataset.reviewPanel = "open";
    main.style.paddingRight = "384px";
    main.getBoundingClientRect = () => rect(0, 1280);
    document.body.append(main);

    const space = tagSpace(rect(160, 700), rect(160, 700));

    // Column ends at 896, so tags have 896 - 16 - (160 + 558) = 162
    expect(space.room).toBe(162);
    expect(space.tagMode).toBe("full");
    const underPanel = tagSpace(rect(160, 880), rect(160, 880));
    expect(underPanel.tagMode).toBe("tight");
  });
});
