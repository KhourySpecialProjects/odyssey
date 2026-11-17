/** @jest-environment node */
import { encodeMentorEvent, MENTOR_PING } from "@/lib/mentor/events";
import { openSse, SSE_PING_MS } from "@/lib/mentor/sse";
import { mentorDone, mentorText } from "@/testing/mocks/mentorEventsMock";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("openSse", () => {
  it("sends headers that stop gzip and buffering", () => {
    const { response, close } = openSse();
    close();
    expect(Object.fromEntries(response.headers)).toEqual({
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    });
  });

  it("pings at once and while open, and sends nothing after close", async () => {
    const sse = openSse();
    sse.send(mentorText("Hi"));
    jest.advanceTimersByTime(SSE_PING_MS);
    sse.send(mentorDone());
    sse.close();
    sse.send(mentorText("late"));
    sse.close();
    expect(jest.getTimerCount()).toBe(0);
    expect(await sse.response.text()).toBe(
      MENTOR_PING +
        encodeMentorEvent(mentorText("Hi")) +
        MENTOR_PING +
        encodeMentorEvent(mentorDone()),
    );
  });

  it("stops and calls onCancel when the browser goes away", async () => {
    const onCancel = jest.fn();
    const sse = openSse({ onCancel });
    await sse.response.body!.cancel();
    sse.send(mentorText("late"));
    sse.close();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
