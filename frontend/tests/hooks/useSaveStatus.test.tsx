import { renderHook, act } from "@testing-library/react";
import { useSaveStatus } from "@/hooks/useSaveStatus";

const fireBeforeUnload = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe("useSaveStatus", () => {
  it("walks pending -> saving -> saved", () => {
    const { result } = renderHook(() => useSaveStatus());
    expect(result.current.status).toBe("idle");
    act(() => result.current.markPending());
    expect(result.current.status).toBe("pending");
    let id = 0;
    act(() => {
      id = result.current.begin();
    });
    expect(result.current.status).toBe("saving");
    act(() => result.current.succeed(id));
    expect(result.current.status).toBe("saved");
  });

  it("stays pending when an edit arrived while the save was in flight", () => {
    const { result } = renderHook(() => useSaveStatus());
    let id = 0;
    act(() => {
      result.current.markPending();
      id = result.current.begin();
      result.current.markPending();
      result.current.succeed(id);
    });
    expect(result.current.status).toBe("pending");
  });

  it("reports a failure and retries it", () => {
    const retry = jest.fn();
    const { result } = renderHook(() => useSaveStatus());
    act(() => {
      const id = result.current.begin();
      result.current.fail(id, retry);
    });
    expect(result.current.status).toBe("failed");
    act(() => result.current.retry());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a frozen save as its own state, not a failure", () => {
    const { result } = renderHook(() => useSaveStatus());
    act(() => result.current.freeze());
    expect(result.current.status).toBe("frozen");
  });

  it("blocks leaving only while a save is pending, running or failed", () => {
    const { result } = renderHook(() => useSaveStatus());
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
    act(() => result.current.markPending());
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
    act(() => {
      const id = result.current.begin();
      result.current.succeed(id);
    });
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
    act(() => {
      const id = result.current.begin();
      result.current.fail(id, jest.fn());
    });
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
    act(() => result.current.reset());
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
