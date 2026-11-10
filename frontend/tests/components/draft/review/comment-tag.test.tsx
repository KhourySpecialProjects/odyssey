import { tagSpace, watchTagRoom } from "@/components/draft/review/comment-tag";

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

describe("watchTagRoom", () => {
  const observerOf = (el: Element) => {
    const observer = jest.mocked(ResizeObserver);
    const i = observer.mock.results.findIndex((r) =>
      (r.value.observe as jest.Mock).mock.calls.some(([e]) => e === el),
    );
    return i < 0
      ? null
      : {
          instance: observer.mock.results[i].value as ResizeObserver,
          callback: observer.mock.calls[i][0],
        };
  };

  beforeEach(() => jest.clearAllMocks());

  it("calls back when <main> resizes, as its padding changes for the panel", () => {
    const main = document.createElement("main");
    const layer = main.appendChild(document.createElement("div"));
    document.body.append(main);
    const onChange = jest.fn();

    const unwatch = watchTagRoom(layer, onChange);
    observerOf(main)!.callback([], {} as ResizeObserver);
    expect(onChange).toHaveBeenCalledTimes(1);

    unwatch();
    expect(observerOf(main)!.instance.disconnect).toHaveBeenCalled();
  });

  it("calls back on a window resize until cleaned up, outside a <main> too", () => {
    const layer = document.body.appendChild(document.createElement("div"));
    const onChange = jest.fn();

    const unwatch = watchTagRoom(layer, onChange);
    window.dispatchEvent(new Event("resize"));
    unwatch();
    window.dispatchEvent(new Event("resize"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ResizeObserver).not.toHaveBeenCalled();
  });
});
