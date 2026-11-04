import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentThread } from "@/components/draft/review/comment-thread";
import { CommentCard } from "@/components/draft/review/comment-card";
import type { ReviewComment } from "@/types";

const reply = (over: Partial<ReviewComment>) =>
  ({
    id: 1,
    field: "blocks",
    anchor: {},
    body: "A reply",
    createdAt: "2026-10-28T12:00:00.000Z",
    ...over,
  }) as ReviewComment;

const ok = { ok: true as const };
const writeBox = () => screen.getByRole("textbox", { name: "Write a reply" });

describe("CommentThread", () => {
  it("lists replies in order with names, 'You', edited and saving", () => {
    render(
      <CommentThread
        closed={false}
        replies={[
          reply({
            id: 1,
            body: "First",
            author: { id: 2, firstName: "Ada", lastName: "Lovelace" } as never,
          }),
          reply({
            id: 2,
            body: "Second",
            mine: true,
            updatedAt: "2026-10-28T12:05:00.000Z",
          }),
          reply({ id: -1, body: "Third", mine: true }),
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("Ada Lovelace"),
      expect.stringContaining("You"),
      expect.stringContaining("Saving…"),
    ]);
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("edited");
    expect(items[0]).not.toHaveTextContent("edited");
  });

  it.each([
    ["closed", { closed: true, onReply: jest.fn() }],
    ["without onReply", { closed: false }],
  ])("has no Reply button when %s", (_n, props) => {
    render(<CommentThread replies={[reply({})]} {...props} />);

    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });

  it("says replies are closed", () => {
    render(<CommentThread replies={[]} closed onReply={jest.fn()} />);

    expect(screen.getByText("Resolved · replies are closed")).toBeVisible();
  });

  it("sends the trimmed text and clears the box", async () => {
    const onReply = jest.fn().mockResolvedValue(ok);
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "  Done  ");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(onReply).toHaveBeenCalledWith("Done");
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
  });

  it("sends on Ctrl+Enter", async () => {
    const onReply = jest.fn().mockResolvedValue(ok);
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "Hi{Control>}{Enter}{/Control}");

    expect(onReply).toHaveBeenCalledWith("Hi");
  });

  it("closes the box with no retry when the server says replies are closed", async () => {
    const onReply = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "review_closed" });
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "Late");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(await screen.findByText("Replies are closed.")).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });

  it.each([
    ["Esc", async () => userEvent.type(writeBox(), "{Escape}")],
    [
      "Cancel",
      async () =>
        userEvent.click(screen.getByRole("button", { name: "Cancel" })),
    ],
    [
      "a send",
      async () => {
        await userEvent.type(writeBox(), "Hi");
        await userEvent.click(screen.getByRole("button", { name: "Reply" }));
      },
    ],
  ])("gives focus back to Reply after %s", async (_n, close) => {
    const onReply = jest.fn().mockResolvedValue(ok);
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    await close();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus(),
    );
  });

  it("clears the text on Cancel and the error on Esc", async () => {
    const onReply = jest.fn().mockResolvedValue({ ok: false, error: "failed" });
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "Hi");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await screen.findByRole("alert");

    await userEvent.type(writeBox(), "{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(screen.queryByRole("alert")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(writeBox()).toHaveValue("");
  });

  it("keeps the text and says so when the save fails", async () => {
    const onReply = jest.fn().mockResolvedValue({ ok: false, error: "failed" });
    render(<CommentThread replies={[]} closed={false} onReply={onReply} />);

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "Hi");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That didn't save. Try again.",
    );
    expect(writeBox()).toHaveValue("Hi");
  });
});

describe("CommentCard threads", () => {
  const anchor = {
    left: 0,
    right: 10,
    top: 0,
    bottom: 10,
    centerX: 5,
  } as never;
  const card = (props = {}, comment: Partial<ReviewComment> = {}) => {
    const onClose = jest.fn();
    render(
      <CommentCard
        comment={reply({ id: 5, body: "Fix this", ...comment })}
        number={1}
        about="A block"
        anchor={anchor}
        canChange
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onResolve={jest.fn()}
        onClose={onClose}
        {...props}
      />,
    );
    return onClose;
  };

  it("Esc in the reply box closes the box, not the card", async () => {
    const onClose = card({ onReply: jest.fn() });

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(writeBox(), "{Escape}");

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("hides Delete once the comment has replies", () => {
    card({}, { replies: [reply({ id: 9 })] });

    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByText("A reply")).toBeVisible();
  });

  it("says nothing about replies when a resolve is refused", async () => {
    const onResolve = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "conflict" });
    card({ onResolve });

    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That didn't save. Try again.",
    );
  });

  it("closes the thread of a resolved comment", () => {
    card({ onReply: jest.fn() }, { resolvedAt: "2026-10-28T12:00:00.000Z" });

    expect(screen.getByText("Resolved · replies are closed")).toBeVisible();
  });

  it("shows the replies message when a delete is refused", async () => {
    const onDelete = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "conflict" });
    card({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This comment has replies. Resolve it instead.",
    );
  });
});
