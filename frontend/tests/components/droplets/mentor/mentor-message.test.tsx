import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import {
  MentorMessage,
  StudentMessage,
} from "@/components/droplets/lessons/mentor/mentor-message";
import type { MentorMsg } from "@/lib/mentor/chat-types";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
// react-markdown is ESM-only; a stand-in is enough to see what text reaches it
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

const citation = {
  ref: "p3",
  blockIndex: 0,
  label: "Joins combine tables",
  anchor: { v: 1 as const, field: "blocks" },
};
const mentorMsg = (overrides: Partial<MentorMsg> = {}): MentorMsg => ({
  id: "m1",
  role: "mentor",
  askId: "s1",
  status: "done",
  text: "A join combines rows [p3].",
  citations: [citation],
  truncated: false,
  ...overrides,
});
const renderMessage = (
  message: MentorMsg,
  props: Partial<Parameters<typeof MentorMessage>[0]> = {},
) =>
  render(
    <ol>
      <MentorMessage
        message={message}
        lessonName="Joins"
        onShowSource={jest.fn()}
        {...props}
      />
    </ol>,
  );

describe("MentorMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
  });

  it("hides refs, including a partial one while streaming", async () => {
    renderMessage(
      mentorMsg({ status: "streaming", text: "Joins [p3] combine [p" }),
    );

    expect(await screen.findByText("Joins combine")).toBeInTheDocument();
    expect(screen.getByText("Read Joins")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Sources" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });

  it("lists Sources only when done, and reports the one pressed", async () => {
    const onShowSource = jest.fn();
    renderMessage(mentorMsg(), { onShowSource });
    expect(screen.getByRole("list", { name: "Sources" })).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Show in lesson: Joins combine tables",
      }),
    );

    expect(onShowSource).toHaveBeenCalledWith(citation);
  });

  it("copies the answer without refs and confirms", async () => {
    renderMessage(mentorMsg());

    await userEvent.click(screen.getByRole("button", { name: /Copy/ }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "A join combines rows.",
      ),
    );
    expect(toast.success).toHaveBeenCalledWith("Copied");
  });

  it("says so when the clipboard refuses", async () => {
    jest
      .mocked(navigator.clipboard.writeText)
      .mockRejectedValueOnce(new Error("denied"));
    renderMessage(mentorMsg());

    await userEvent.click(screen.getByRole("button", { name: /Copy/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't copy"),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("offers Try again on a retryable error, with no tools", async () => {
    const onRetry = jest.fn();
    renderMessage(
      mentorMsg({
        status: "error",
        text: "",
        citations: [],
        error: { message: "Too many requests.", retry: true },
      }),
      { onRetry },
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });

  it("marks a stopped answer, hides a half-streamed ref, and keeps Copy but not Save", async () => {
    renderMessage(
      mentorMsg({ status: "stopped", text: "Joins combine tables [p3, p" }),
      { onSave: jest.fn() },
    );

    expect(await screen.findByText("Joins combine tables")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save to notes/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Copy/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Joins combine tables",
    );
  });

  it("has no Copy when stopped before any text arrived", () => {
    renderMessage(mentorMsg({ status: "stopped", text: "" }));

    expect(screen.getByText("Stopped")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });

  it("saves once, keeps focus, and then reads Saved", async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    renderMessage(mentorMsg(), { onSave });

    await userEvent.click(
      screen.getByRole("button", { name: /Save to notes/ }),
    );

    const saved = await screen.findByRole("button", { name: /Saved/ });
    expect(saved).toHaveAttribute("aria-disabled", "true");
    expect(saved).toHaveFocus();
    await userEvent.click(saved);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("stays usable when saving fails", async () => {
    const onSave = jest.fn().mockRejectedValue(new Error("nope"));
    renderMessage(mentorMsg(), { onSave });

    await userEvent.click(
      screen.getByRole("button", { name: /Save to notes/ }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Save to notes/ }),
      ).toHaveAttribute("aria-disabled", "false"),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Save to notes/ }),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("shows thumbs only when onRate is passed", async () => {
    const { unmount } = renderMessage(mentorMsg());
    expect(screen.queryByRole("button", { name: "Good answer" })).toBeNull();
    unmount();

    const onRate = jest.fn();
    renderMessage(mentorMsg(), { onRate });
    await userEvent.click(screen.getByRole("button", { name: "Good answer" }));
    expect(onRate).toHaveBeenCalledWith("up");
  });
});

describe("StudentMessage", () => {
  it("shows the student's text", () => {
    render(
      <ol>
        <StudentMessage
          message={{ id: "s1", role: "student", text: "Explain joins" }}
        />
      </ol>,
    );
    expect(screen.getByText("Explain joins")).toBeInTheDocument();
  });
});
