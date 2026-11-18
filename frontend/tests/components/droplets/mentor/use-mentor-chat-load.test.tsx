import { act, renderHook, waitFor } from "@testing-library/react";
import { useMentorChat } from "@/hooks/use-mentor-chat";
import { getMentorChat } from "@/lib/requests/mentor-chats";

jest.mock("@/lib/requests/mentor-chats", () => ({ getMentorChat: jest.fn() }));

const found = (lessonId: number) => ({
  ok: true,
  data: {
    chat: {
      documentId: "chatAAAA1111",
      kind: "lesson",
      lesson: { id: lessonId },
    },
    messages: [
      { documentId: "a", role: "user", text: "Q1", citations: null },
      {
        documentId: "b",
        role: "assistant",
        text: "A1 [p1]",
        citations: [{ ref: "p1", label: "L" }],
      },
    ],
  },
});
const setup = () =>
  renderHook(() => useMentorChat({ dropletId: 3, lessonId: 9 }));

beforeEach(() => jest.clearAllMocks());

describe("useMentorChat loadChat", () => {
  it("replaces the conversation and sets the open chat id", async () => {
    jest.mocked(getMentorChat).mockResolvedValue(found(9) as never);
    const { result } = setup();

    let ok = false;
    await act(async () => {
      ok = await result.current.loadChat("chatAAAA1111");
    });

    expect(ok).toBe(true);
    expect(result.current.openChatId).toBe("chatAAAA1111");
    expect(result.current.messages.map((m) => m.role)).toEqual([
      "student",
      "mentor",
    ]);
    const answer = result.current.messages[1];
    expect(answer.role === "mentor" && answer.citations).toHaveLength(1);
  });

  it("drops citations for a chat that started in another lesson", async () => {
    jest.mocked(getMentorChat).mockResolvedValue(found(4) as never);
    const { result } = setup();
    await act(async () => {
      await result.current.loadChat("chatAAAA1111");
    });

    const answer = result.current.messages[1];
    expect(answer.role === "mentor" && answer.citations).toEqual([]);
  });

  it("leaves the conversation alone when the chat can't be loaded", async () => {
    jest
      .mocked(getMentorChat)
      .mockResolvedValue({ ok: false, error: "not_found" });
    const { result } = setup();
    let ok = true;
    await act(async () => {
      ok = await result.current.loadChat("chatAAAA1111");
    });

    expect(ok).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.openChatId).toBeNull();
  });

  it("onlyIfEmpty gives up once something was loaded, and clear resets", async () => {
    jest.mocked(getMentorChat).mockResolvedValue(found(9) as never);
    const { result } = setup();
    await act(async () => {
      await result.current.loadChat("chatAAAA1111");
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.loadChat("chatAAAA1111", { onlyIfEmpty: true });
    });
    expect(ok).toBe(false);

    act(() => result.current.clear());
    await waitFor(() => expect(result.current.openChatId).toBeNull());
    expect(result.current.messages).toEqual([]);
  });
});
