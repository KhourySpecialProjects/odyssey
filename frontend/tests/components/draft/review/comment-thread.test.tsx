import { useState } from "react";
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
  it("shows own replies right-aligned as 'You', others left with name and initials", () => {
    render(
      <CommentThread
        closed={false}
        replies={[
          reply({
            id: 1,
            body: "Theirs",
            author: { id: 2, firstName: "Ada", lastName: "Lovelace" } as never,
          }),
          reply({ id: 2, body: "Ours", mine: true }),
        ]}
      />,
    );
    const [theirs, ours] = screen.getAllByRole("listitem");
    expect(theirs).not.toHaveClass("justify-end");
    expect(theirs).toHaveTextContent("AL");
    expect(theirs).toHaveTextContent("Ada Lovelace");
    expect(ours).toHaveClass("justify-end");
    expect(ours).not.toHaveTextContent("AL");
    expect(screen.getByText("You")).toHaveClass("sr-only");
    expect(screen.getByText("Ours")).toHaveClass("bg-[var(--rc-accent)]");
    expect(screen.getByText("Theirs")).not.toHaveClass("bg-[var(--rc-accent)]");
  });

  it("shows the name and initials once for a run of replies by one person", () => {
    const ada = { id: 2, firstName: "Ada", lastName: "Lovelace" } as never;
    render(
      <CommentThread
        closed={false}
        replies={[
          reply({ id: 1, body: "One", author: ada }),
          reply({ id: 2, body: "Two", author: ada }),
          reply({ id: 3, body: "Mine", mine: true }),
          reply({ id: 4, body: "Three", author: ada }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent?.includes("AL"))).toEqual([
      true,
      false,
      false,
      true,
    ]);
    // A repeat keeps its author name for screen readers
    expect(screen.getAllByText("Ada Lovelace").map((n) => n.className)).toEqual(
      [
        expect.not.stringContaining("sr-only"),
        "sr-only",
        expect.not.stringContaining("sr-only"),
      ],
    );
  });

  it("shows New once per run of new replies, on the last", () => {
    const ada = { id: 2, firstName: "Ada", lastName: "Lovelace" } as never;
    const bob = { id: 3, firstName: "Bob", lastName: "Lee" } as never;
    render(
      <CommentThread
        closed={false}
        fresh={new Set([2, 3, 4])}
        replies={[
          reply({ id: 1, author: ada }),
          reply({ id: 2, author: ada }),
          reply({ id: 3, author: ada }),
          reply({ id: 4, author: bob }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent?.includes("New"))).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  describe("where the list opens", () => {
    // jsdom has no layout: every list is 500 px tall, the first New row at 40
    const layout = ["scrollHeight", "offsetTop"].map(
      (key) =>
        [
          key,
          Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
        ] as const,
    );
    beforeAll(() => {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        get: () => 500,
      });
      Object.defineProperty(HTMLElement.prototype, "offsetTop", {
        configurable: true,
        get() {
          return (this as HTMLElement).dataset.fresh ? 40 : 0;
        },
      });
    });
    afterAll(() => {
      for (const [key, d] of layout)
        if (d) Object.defineProperty(HTMLElement.prototype, key, d);
        else Reflect.deleteProperty(HTMLElement.prototype, key);
    });
    const replies = [1, 2, 3].map((id) => reply({ id, body: `R${id}` }));
    const list = () => screen.getByRole("list", { name: "Replies" });

    it.each([
      ["the newest reply", undefined, 500],
      ["the first New reply", new Set([2, 3]), 40],
    ])("opens at %s", (_n, fresh, top) => {
      render(<CommentThread closed={false} replies={replies} fresh={fresh} />);

      expect(list().scrollTop).toBe(top);
    });

    it.each([
      ["follows your own new reply", true, 500],
      ["stays put for someone else's", false, 0],
    ])("scrolled up, %s", (_n, mine, top) => {
      const { rerender } = render(
        <CommentThread closed={false} replies={replies} />,
      );
      list().scrollTop = 0;
      list().dispatchEvent(new Event("scroll"));
      rerender(
        <CommentThread
          closed={false}
          replies={[...replies, reply({ id: 4, mine })]}
        />,
      );

      expect(list().scrollTop).toBe(top);
    });
  });

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

  const ada = { id: 2, firstName: "Ada", lastName: "Lovelace" } as never;

  it.each([
    ["yours, on the right", true, "You", true],
    ["the reviewer's, on the left", false, "Ada Lovelace", false],
  ])("draws the comment as the first bubble: %s", (_n, mine, name, accent) => {
    card({}, { author: ada, mine });

    expect(screen.getByText(name)).toHaveClass(
      mine ? "sr-only" : "font-semibold",
    );
    expect(screen.getByText("Fix this").className.includes("rc-accent")).toBe(
      accent,
    );
  });

  it("counts a comment not read back yet (no author) as yours", () => {
    card();

    expect(screen.getByText("You")).toHaveClass("sr-only");
  });

  it("continues the comment's run when its author replies first", () => {
    card(
      {},
      { author: ada, mine: false, replies: [reply({ id: 6, author: ada })] },
    );

    expect(screen.getAllByText("Ada Lovelace").map((n) => n.className)).toEqual(
      [expect.stringContaining("font-semibold"), "sr-only"],
    );
  });

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

describe("CommentThread edit and delete of own replies", () => {
  const mine = reply({ id: 5, body: "Mine", mine: true });
  const theirs = reply({ id: 6, body: "Theirs" });
  const edits = () => ({
    edit: jest.fn().mockResolvedValue(ok),
    remove: jest.fn().mockResolvedValue(ok),
  });
  const thread = (
    replies: ReviewComment[],
    e = edits(),
    props: object = {},
  ) => {
    render(
      <CommentThread
        replies={replies}
        closed={false}
        onReply={jest.fn()}
        edits={e}
        {...props}
      />,
    );
    return e;
  };

  it("saves an edit, trimmed, and returns focus to Edit", async () => {
    const e = thread([mine]);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByRole("textbox", { name: "Edit your reply" });
    await userEvent.clear(box);
    await userEvent.type(box, "  Better ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(e.edit).toHaveBeenCalledWith(5, "Better");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus(),
    );
  });

  it("keeps the text and says so when the edit is refused", async () => {
    const e = edits();
    e.edit.mockResolvedValue({ ok: false, error: "failed" });
    thread([mine], e);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Edit your reply" }),
      "!",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That didn't save. Try again.",
    );
    expect(
      screen.getByRole("textbox", { name: "Edit your reply" }),
    ).toHaveValue("Mine!");
  });

  it("cancels an edit with Escape, leaving the text unchanged", async () => {
    const e = thread([mine]);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.getByText("Mine")).toBeVisible();
    expect(e.edit).not.toHaveBeenCalled();
  });

  it("confirms before deleting", async () => {
    const e = thread([mine]);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this reply?")).toBeVisible();
    expect(e.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(e.remove).toHaveBeenCalledWith(5);
  });

  it("says someone has replied since on a conflict", async () => {
    const e = edits();
    e.remove.mockResolvedValue({ ok: false, error: "conflict" });
    thread([mine], e);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Someone has replied since.",
    );
  });

  it.each([
    ["it isn't the viewer's", [theirs]],
    ["someone else replied after it", [mine, theirs]],
    ["it is still saving", [reply({ id: -1, mine: true })]],
  ])("offers no Edit or Delete when %s", (_n, replies) => {
    thread(replies);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("still offers them when only the viewer's own replies follow", () => {
    thread([mine, reply({ id: 7, body: "Again", mine: true })]);

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it.each([
    ["the thread is closed", { closed: true }],
    ["there is no onReply", { onReply: undefined }],
  ])("offers none when %s", (_n, props) => {
    thread([mine], edits(), props);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("focuses Keep when the delete confirmation opens", async () => {
    thread([mine]);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
  });

  it("stops editing, saying why, when another reply lands meanwhile", async () => {
    const e = edits();
    const props = { closed: false, onReply: jest.fn(), edits: e };
    const { rerender } = render(<CommentThread replies={[mine]} {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    rerender(<CommentThread replies={[mine, theirs]} {...props} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Someone has replied since.",
    );
    expect(
      screen.queryByRole("textbox", { name: "Edit your reply" }),
    ).toBeNull();
  });

  describe("with a list that really drops the reply while pending", () => {
    /** Removes the reply at once, then restores it if the outcome is a refusal. */
    function Harness({
      result,
    }: {
      result: { ok: false; error: string } | typeof ok;
    }) {
      const [replies, setReplies] = useState([mine]);
      const change = async (id: number, next: ReviewComment | null) => {
        const before = replies;
        setReplies((rs) =>
          next
            ? rs.map((r) => (r.id === id ? next : r))
            : rs.filter((r) => r.id !== id),
        );
        await Promise.resolve();
        if (!result.ok) setReplies(before);
        return result as never;
      };
      return (
        <CommentThread
          replies={replies}
          closed={false}
          onReply={jest.fn()}
          edits={{
            edit: (id, body) =>
              change(id, {
                ...mine,
                body,
                createdAt: "2026-10-28T12:00:00.000Z",
                updatedAt: "2026-10-28T12:05:00.000Z",
              }),
            remove: (id) => change(id, null),
          }}
        />
      );
    }

    const deleteIt = async () => {
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      await userEvent.click(
        screen.getAllByRole("button", { name: "Delete" })[0],
      );
    };

    it.each([
      ["failed", "That didn't save. Try again."],
      ["conflict", "Someone has replied since."],
    ])(
      "says why a refused delete (%s) failed and focuses Reply",
      async (error, text) => {
        render(<Harness result={{ ok: false, error }} />);

        await deleteIt();

        expect(await screen.findByRole("alert")).toHaveTextContent(text);
        expect(screen.getByText("Mine")).toBeVisible();
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus(),
        );
      },
    );

    it("removes the reply and focuses Reply when the delete succeeds", async () => {
      render(<Harness result={ok} />);

      await deleteIt();

      await waitFor(() => expect(screen.queryByText("Mine")).toBeNull());
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus(),
      );
    });

    it.each(["edit", "delete"])(
      "closes the whole thread when the %s says review_closed",
      async (which) => {
        render(<Harness result={{ ok: false, error: "review_closed" }} />);

        if (which === "delete") {
          await deleteIt();
        } else {
          await userEvent.click(screen.getByRole("button", { name: "Edit" }));
          await userEvent.click(screen.getByRole("button", { name: "Save" }));
        }

        expect(await screen.findByText("Replies are closed.")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
      },
    );

    it("leaves edit mode on a conflict and focuses Reply", async () => {
      render(<Harness result={{ ok: false, error: "conflict" }} />);

      await userEvent.click(screen.getByRole("button", { name: "Edit" }));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Someone has replied since.",
      );
      expect(
        screen.queryByRole("textbox", { name: "Edit your reply" }),
      ).toBeNull();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus(),
      );
    });

    it("shows 'edited' once an edit is saved", async () => {
      render(<Harness result={ok} />);

      await userEvent.click(screen.getByRole("button", { name: "Edit" }));
      await userEvent.type(
        screen.getByRole("textbox", { name: "Edit your reply" }),
        "!",
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("· edited")).toBeVisible();
    });
  });
});
