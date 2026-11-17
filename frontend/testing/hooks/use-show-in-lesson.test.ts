import { renderHook, act } from "@testing-library/react";
import { useShowInLesson } from "@/hooks/use-show-in-lesson";
import type { Focused } from "@/components/draft/review/review-focus-context";

const report = jest.fn();
let focused: Focused | null = null;
jest.mock("@/components/draft/review/review-focus-context", () => ({
  useReviewFocus: () => ({ focused, report }),
}));

const request = (
  over: Partial<Focused["target"]> = {},
  rest: Partial<Focused> = {},
): Focused => ({
  target: {
    kind: "comment",
    markId: "comment-4",
    lessonId: 2,
    field: "blocks",
    place: "Lesson 2",
    quote: "beta",
    ...over,
  },
  nonce: 1,
  navigate: true,
  done: false,
  ...rest,
});

const scrollIntoView = jest.fn();
const reduced = (on: boolean) =>
  (window.matchMedia as jest.Mock).mockImplementation(() => ({ matches: on }));

function setup(over = {}) {
  const onComment = jest.fn();
  const args = {
    lessonId: 2 as number | null,
    ready: true,
    mode: "comment",
    enabled: true,
    onComment,
    isOutdated: (_id: string) => false,
    ...over,
  };
  const hook = renderHook((p) => useShowInLesson(p), { initialProps: args });
  return { onComment, hook, args };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  window.matchMedia = jest.fn(() => ({ matches: false })) as never;
  Element.prototype.scrollIntoView = scrollIntoView;
  document.body.innerHTML = `<main><div class="ProseMirror"></div>
    <span class="anchor-badge" data-anchor-id="comment-4"></span>
    <span data-anchor-id="comment-4">beta</span>
    <section data-review-section="description"></section></main>`;
});
afterEach(() => jest.useRealTimers());

const mark = () =>
  document.querySelector<HTMLElement>(
    '[data-anchor-id="comment-4"]:not(.anchor-badge)',
  )!;
const wait = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

describe("useShowInLesson", () => {
  it("switches to Comment, then scrolls, flashes and reports", () => {
    focused = request();
    const { onComment, hook, args } = setup({ mode: "read" });
    expect(onComment).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();

    hook.rerender({ ...args, mode: "comment" });
    wait(50);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
    expect(mark().classList).toContain("review-mark--flash");
    expect(report).toHaveBeenCalledWith(1, "shown");
    wait(600);
    expect(mark().classList).not.toContain("review-mark--flash");
  });

  it("uses no smooth scroll or flash under reduced motion", () => {
    reduced(true);
    focused = request();
    setup();
    wait(50);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "auto",
    });
    expect(mark().classList).not.toContain("review-mark--flash");
  });

  it("reports outdated only when the page says so", () => {
    focused = request();
    setup({ isOutdated: () => true });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(1, "outdated");
  });

  it("re-checks outdated on each tick", () => {
    focused = request({ markId: "comment-99" });
    let outdated = false;
    setup({ isOutdated: () => outdated });
    outdated = true;
    wait(50);
    expect(report).toHaveBeenCalledWith(1, "outdated");
  });

  it("reports missing, not outdated, when the mark never appears", () => {
    focused = request({ markId: "comment-99" });
    setup();
    wait(2100);
    expect(report).toHaveBeenCalledWith(1, "missing");
  });

  it("starts the 2 s clock only once the view is on the page", () => {
    document.querySelector(".ProseMirror")!.remove();
    focused = request({ markId: "comment-99" });
    setup();
    wait(3000);
    expect(report).not.toHaveBeenCalled();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="ProseMirror"></div>',
    );
    wait(1000);
    expect(report).not.toHaveBeenCalled();
    wait(1100);
    expect(report).toHaveBeenCalledWith(1, "missing");
  });

  it("scrolls and reports a mark that appears after 100 ms", () => {
    document.querySelector("span:not(.anchor-badge)")!.remove();
    const late = document.querySelector(
      '[data-anchor-id="comment-4"]:not(.anchor-badge)',
    );
    expect(late).toBeNull();
    focused = request();
    setup();
    expect(report).not.toHaveBeenCalled();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<span data-anchor-id="comment-4">beta</span>',
    );
    wait(100);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(1, "shown");
  });

  it("stops polling when unmounted", () => {
    document
      .querySelector('[data-anchor-id="comment-4"]:not(.anchor-badge)')!
      .remove();
    focused = request();
    const { hook } = setup();
    wait(50);
    hook.unmount();
    wait(2100);
    expect(report).not.toHaveBeenCalled();
  });

  it("reports missing at once when the page can't show reviews", () => {
    focused = request();
    const { onComment } = setup({ enabled: false, mode: "read" });
    expect(onComment).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(1, "missing");
  });

  it("flashes again on a repeat request", () => {
    focused = request();
    const { hook, args } = setup();
    wait(600);
    focused = request({}, { nonce: 2 });
    hook.rerender({ ...args });
    expect(mark().classList).toContain("review-mark--flash");
    expect(report).toHaveBeenLastCalledWith(2, "shown");
  });

  it("scrolls a section target without a flash", () => {
    focused = request({ kind: "section", field: "description" });
    setup();
    wait(50);
    expect(report).toHaveBeenCalledWith(1, "shown");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(mark().classList).not.toContain("review-mark--flash");
  });

  it("reports a section that isn't on the page as missing", () => {
    focused = request({ kind: "section", field: "nope" });
    setup();
    expect(report).toHaveBeenCalledWith(1, "missing");
  });

  it("only scrolls for a select, with no mode switch or report", () => {
    focused = request({}, { navigate: false });
    const { onComment } = setup({ mode: "read" });
    wait(50);
    expect(onComment).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it.each([
    ["another page", { lessonId: 3 }, {}],
    ["a handled request", {}, { done: true }],
  ])("does nothing for %s", (_n, target, rest) => {
    focused = request(target, rest);
    const { onComment } = setup({ mode: "read" });
    wait(2100);
    expect(onComment).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });
});
