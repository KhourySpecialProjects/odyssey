import { render, screen, act, waitFor } from "@testing-library/react";
import {
  ReviewFocusProvider,
  useReviewFocus,
  type FocusTarget,
} from "@/components/draft/review/review-focus-context";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/draft/d/intro",
}));

const target = (over: Partial<FocusTarget> = {}): FocusTarget => ({
  kind: "finding",
  markId: "finding-1",
  lessonId: 2,
  field: "blocks",
  place: "Lesson 2",
  quote: "beta",
  ...over,
});

let api: ReturnType<typeof useReviewFocus>;
function Probe() {
  api = useReviewFocus();
  return null;
}
const mount = () =>
  render(
    <ReviewFocusProvider active>
      <Probe />
    </ReviewFocusProvider>,
  );

beforeEach(() => jest.clearAllMocks());

describe("ReviewFocusProvider requests", () => {
  it.each([
    ["/draft/d/intro/loops", 1],
    ["/draft/d/intro", 0],
  ])("show(%s) pushes %i time(s)", (url, pushes) => {
    mount();
    act(() => api!.show(target(), url));
    expect(push).toHaveBeenCalledTimes(pushes);
    expect(api!.focused).toMatchObject({ navigate: true, done: false });
  });

  it("select records the target without navigating", () => {
    mount();
    act(() => api!.select(target()));
    expect(api!.focused).toMatchObject({ navigate: false });
    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    ["finding", "shown", "Showing issue in Lesson 2: “beta”"],
    ["comment", "shown", "Showing comment in Lesson 2: “beta”"],
    ["comment", "outdated", "Outdated: the text it pointed at has changed"],
    ["comment", "missing", "Couldn't find it on the page"],
  ] as const)("announces a %s as %s", async (kind, outcome, text) => {
    mount();
    act(() => api!.show(target({ kind }), "/draft/d/intro"));
    act(() => api!.report(api!.focused!.nonce, outcome));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(text),
    );
    expect(api!.focused!.done).toBe(true);
  });

  it("ignores a report for an old request", () => {
    mount();
    act(() => api!.show(target(), "/draft/d/intro"));
    const old = api!.focused!.nonce;
    act(() => api!.show(target({ markId: "finding-2" }), "/draft/d/intro"));
    act(() => api!.report(old, "shown"));
    expect(api!.focused!.done).toBe(false);
  });

  it("pushes a repeated URL once while the first push is on its way", () => {
    mount();
    act(() => api!.show(target(), "/draft/d/intro/loops"));
    act(() =>
      api!.show(target({ markId: "finding-2" }), "/draft/d/intro/loops"),
    );
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("ends a request no page answers", () => {
    jest.useFakeTimers();
    mount();
    act(() => api!.show(target(), "/draft/d/intro"));
    act(() => void jest.advanceTimersByTime(10_001));
    expect(api!.focused!.done).toBe(true);
    jest.useRealTimers();
  });
});
