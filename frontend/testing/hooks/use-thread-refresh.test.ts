import { act, renderHook } from "@testing-library/react";
import { useThreadRefresh } from "@/hooks/use-thread-refresh";
import { getThreadStamp } from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({ getThreadStamp: jest.fn() }));

const mockedStamp = jest.mocked(getThreadStamp);
const stamp = (s: string) =>
  mockedStamp.mockResolvedValue({ ok: true, error: null, data: { stamp: s } });
const flush = () => act(async () => {});
const tick = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
const focus = () =>
  act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
const visibilityChange = () =>
  act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
const setVisibility = (state: "visible" | "hidden") =>
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  setVisibility("visible");
  stamp("1");
});
afterEach(() => jest.useRealTimers());

describe("useThreadRefresh", () => {
  it("checks on mount and every 30 s, and reloads only when the stamp changes", async () => {
    const onChange = jest.fn();
    renderHook(() => useThreadRefresh(3, true, onChange));
    await flush();
    expect(mockedStamp).toHaveBeenCalledTimes(1);

    await tick(30_000);
    expect(mockedStamp).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();

    stamp("2");
    await tick(30_000);
    expect(onChange).toHaveBeenCalledTimes(1);
    await tick(30_000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("makes no request while hidden or disabled, and checks on focus", async () => {
    setVisibility("hidden");
    const { rerender } = renderHook(
      ({ on }) => useThreadRefresh(3, on, jest.fn()),
      { initialProps: { on: true } },
    );
    await tick(90_000);
    expect(mockedStamp).not.toHaveBeenCalled();

    setVisibility("visible");
    await focus();
    expect(mockedStamp).toHaveBeenCalledTimes(1);

    mockedStamp.mockClear();
    rerender({ on: false });
    await tick(90_000);
    expect(mockedStamp).not.toHaveBeenCalled();
  });

  it("checks when the tab becomes visible, and once for visibilitychange plus focus", async () => {
    setVisibility("hidden");
    renderHook(() => useThreadRefresh(3, true, jest.fn()));
    await tick(10_000);
    expect(mockedStamp).not.toHaveBeenCalled();

    setVisibility("visible");
    await visibilityChange();
    await focus();
    expect(mockedStamp).toHaveBeenCalledTimes(1);
  });

  it("pauses after 3 straight failures until the next focus", async () => {
    mockedStamp.mockResolvedValue({ ok: false, error: "failed", data: null });
    renderHook(() => useThreadRefresh(3, true, jest.fn()));
    await flush();
    await tick(30_000);
    await tick(30_000);
    expect(mockedStamp).toHaveBeenCalledTimes(3);

    await tick(120_000);
    expect(mockedStamp).toHaveBeenCalledTimes(3);

    await focus();
    expect(mockedStamp).toHaveBeenCalledTimes(4);
  });

  it("skips a check within 5 s of a good one, however it is triggered", async () => {
    const { result } = renderHook(() => useThreadRefresh(3, true, jest.fn()));
    await flush();
    await act(async () => {
      await result.current.check();
      await result.current.check();
      await result.current.check();
    });
    expect(mockedStamp).toHaveBeenCalledTimes(1);

    await tick(6_000);
    await act(async () => {
      await result.current.check();
    });
    expect(mockedStamp).toHaveBeenCalledTimes(2);
  });

  it("makes one request for a wake at 29 s and the tick at 30 s", async () => {
    renderHook(() => useThreadRefresh(3, true, jest.fn()));
    await flush();
    mockedStamp.mockClear();

    await tick(29_000);
    await focus();
    await tick(1_000);
    expect(mockedStamp).toHaveBeenCalledTimes(1);
  });

  it("ignores a stamp that lands after the droplet changed", async () => {
    let resolveFirst: (v: never) => void = () => {};
    mockedStamp.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve as never)),
    );
    const onChange = jest.fn();
    const { rerender } = renderHook(
      ({ id }) => useThreadRefresh(id, true, onChange),
      { initialProps: { id: 3 } },
    );
    stamp("B1");
    rerender({ id: 4 });
    await flush();
    await act(async () => {
      resolveFirst({ ok: true, error: null, data: { stamp: "A9" } } as never);
    });
    // B's baseline is its own first stamp, so B1 then B2 is the only change
    stamp("B2");
    await tick(30_000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls nothing after unmount", async () => {
    let resolveStamp: (v: never) => void = () => {};
    const onChange = jest.fn();
    const { unmount } = renderHook(() => useThreadRefresh(3, true, onChange));
    await flush();
    mockedStamp.mockImplementationOnce(
      () => new Promise((resolve) => (resolveStamp = resolve as never)),
    );
    await tick(30_000);
    unmount();
    await act(async () => {
      resolveStamp({ ok: true, error: null, data: { stamp: "9" } } as never);
    });
    await tick(60_000);
    expect(onChange).not.toHaveBeenCalled();
    expect(mockedStamp).toHaveBeenCalledTimes(2);
  });

  it("check() runs one on demand once the last good check is old enough", async () => {
    const { result } = renderHook(() => useThreadRefresh(3, true, jest.fn()));
    await flush();
    await tick(6_000);
    await act(async () => {
      await result.current.check();
    });
    expect(mockedStamp).toHaveBeenCalledTimes(2);
  });
});
