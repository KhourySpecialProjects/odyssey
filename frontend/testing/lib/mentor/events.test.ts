// jsdom, like the components that read answers
import { ReadableStream } from "node:stream/web";
import {
  encodeMentorEvent,
  MENTOR_PING,
  MentorStreamError,
  readMentorEvents,
} from "@/lib/mentor/events";
import {
  mentorBody,
  mentorCitation,
  mentorDone,
  mentorError,
  mentorSseResponse,
  mentorText,
  readAllMentorEvents as read,
} from "@/testing/mocks/mentorEventsMock";

const encoder = new TextEncoder();

describe("readMentorEvents", () => {
  it.each([
    [
      "text, then done with citations",
      [
        mentorText('One\n\nSay "hi" [p2]'),
        mentorDone({ citations: [mentorCitation()], truncated: true }),
      ],
    ],
    [
      "text, then an error",
      [mentorText("Partly"), mentorError("refused", "Mentor can't help.")],
    ],
  ])("reads back %s", async (_, events) => {
    expect(await read(mentorSseResponse(events).body!)).toEqual(events);
  });

  it("reads frames split anywhere, with CRLF line ends", async () => {
    const bytes = encoder.encode(encodeMentorEvent(mentorText("café ☕")));
    const cut = bytes.indexOf(0xe2) + 1; // inside the 3 bytes of ☕
    expect(
      await read(
        mentorBody(
          "event: te",
          'xt\r\ndata: {"text":"a"}\r',
          "\n\r\n",
          bytes.slice(0, cut),
          bytes.slice(cut),
          encodeMentorEvent(mentorDone()),
        ),
      ),
    ).toEqual([mentorText("a"), mentorText("café ☕"), mentorDone()]);
  });

  it("skips pings and unknown events, and stops at done", async () => {
    expect(
      await read(
        mentorBody(
          MENTOR_PING,
          "event: other\ndata: {}\n\n",
          encodeMentorEvent(mentorDone()),
          encodeMentorEvent(mentorText("after")),
        ),
      ),
    ).toEqual([mentorDone()]);
  });

  it.each([
    [
      "ends before done",
      mentorBody(encodeMentorEvent(mentorText("a")), "event: done\ndata: {"),
      MentorStreamError,
    ],
    [
      "sends a frame that isn't JSON",
      mentorBody("event: text\ndata: {oops\n\n"),
      MentorStreamError,
    ],
    [
      "loses its connection",
      mentorSseResponse([mentorText("a"), mentorDone()], { dropAfter: 1 })
        .body!,
      TypeError,
    ],
  ])("throws when the stream %s", async (_, body, error) => {
    await expect(read(body)).rejects.toThrow(error);
  });

  it("throws the fetch's AbortError when the student stops", async () => {
    const stop = new AbortController();
    const events = read(
      mentorSseResponse([mentorText("a"), mentorDone()], {
        delayMs: 5,
        signal: stop.signal,
      }).body!,
    );
    stop.abort();
    await expect(events).rejects.toMatchObject({ name: "AbortError" });
  });

  it("cancels the body when the reader stops early", async () => {
    const cancel = jest.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(encodeMentorEvent(mentorText("a"))));
      },
      cancel,
    }) as unknown as globalThis.ReadableStream<Uint8Array>;
    for await (const event of readMentorEvents(body)) {
      expect(event).toEqual(mentorText("a"));
      break;
    }
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
