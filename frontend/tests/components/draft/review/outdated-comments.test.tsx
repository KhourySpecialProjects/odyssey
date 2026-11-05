import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OutdatedComments,
  type OutdatedCard,
} from "@/components/draft/review/outdated-comments";
import type { ReviewComment } from "@/types";

const make = (over: Partial<ReviewComment>) =>
  ({
    id: 1,
    field: "blocks",
    anchor: { blockId: "b", quote: "old text", start: 0, end: 8 },
    body: "Fix this",
    createdAt: "2026-10-28T12:00:00.000Z",
    ...over,
  }) as ReviewComment;

const ok = { ok: true as const };
const cardFor = (over: Partial<OutdatedCard> = {}): OutdatedCard => ({
  canChange: false,
  onEdit: jest.fn().mockResolvedValue(ok),
  onDelete: jest.fn().mockResolvedValue(ok),
  onResolve: jest.fn().mockResolvedValue(ok),
  meta: () => "Round 1",
  ...over,
});
const numbers = new Map([
  [1, 3],
  [2, 4],
]);
const item = (n: number) =>
  screen.getByRole("button", { name: new RegExp(`^Comment ${n}, outdated`) });

describe("OutdatedComments", () => {
  it("is plain text without a card", () => {
    render(<OutdatedComments comments={[make({})]} />);

    expect(screen.getByText(/Fix this/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lists the number, the quote, the body and the reply count", () => {
    render(
      <OutdatedComments
        comments={[make({ replies: [{ id: 9 }, { id: 10 }] as never })]}
        numbers={numbers}
        card={cardFor()}
      />,
    );

    expect(item(3)).toHaveTextContent("3.");
    expect(item(3)).toHaveTextContent("old text");
    expect(item(3)).toHaveTextContent("· 2 replies");
  });

  it("creator: opens the card, marks addressed and replies", async () => {
    const onAddress = jest.fn().mockResolvedValue(ok);
    const onReply = jest.fn().mockResolvedValue(ok);
    render(
      <OutdatedComments
        comments={[make({})]}
        numbers={numbers}
        card={cardFor({ onAddress, onReply, forCreator: true })}
      />,
    );

    await userEvent.click(item(3));
    await userEvent.click(
      await screen.findByRole("button", { name: /mark addressed/i }),
    );
    await waitFor(() => expect(onAddress).toHaveBeenCalledWith(1, true));

    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Write a reply" }),
      "Done",
    );
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await waitFor(() => expect(onReply).toHaveBeenCalledWith(1, "Done"));
  });

  it("reviewer: Reply only on a carried copy", async () => {
    const onReply = jest.fn().mockResolvedValue(ok);
    render(
      <OutdatedComments
        comments={[
          make({ id: 1, carriedFrom: { id: 7 } as never }),
          make({ id: 2, body: "Fresh" }),
        ]}
        numbers={numbers}
        card={cardFor({ onReply, replyOnCarried: true })}
      />,
    );

    await userEvent.click(item(3));
    expect(await screen.findByRole("button", { name: "Reply" })).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(item(4));
    await screen.findByRole("button", { name: /close|resolve/i });
    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });

  it("Enter opens, Esc closes and returns focus; one card at a time", async () => {
    render(
      <OutdatedComments
        comments={[make({ id: 1 }), make({ id: 2, body: "Other" })]}
        numbers={numbers}
        card={cardFor()}
      />,
    );

    item(3).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(item(3)).toHaveAttribute("aria-expanded", "true"),
    );
    expect(screen.getByRole("dialog")).toHaveFocus();

    await userEvent.click(item(4));
    await waitFor(() =>
      expect(item(4)).toHaveAttribute("aria-expanded", "true"),
    );
    expect(item(3)).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(item(4)).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("canChange: Resolve closes the card and returns focus; Edit and Delete show", async () => {
    const onResolve = jest.fn().mockResolvedValue(ok);
    render(
      <OutdatedComments
        comments={[make({})]}
        numbers={numbers}
        card={cardFor({ canChange: true, onResolve })}
      />,
    );

    await userEvent.click(item(3));
    expect(screen.getByRole("button", { name: /edit/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /delete/i })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /resolve/i }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(1, true));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(item(3)).toHaveFocus());
  });

  it("canChange: hides Delete and Edit when the comment has replies (G16)", async () => {
    render(
      <OutdatedComments
        comments={[make({ replies: [{ id: 9, body: "r" }] as never })]}
        numbers={numbers}
        card={cardFor({ canChange: true })}
      />,
    );

    await userEvent.click(item(3));

    expect(screen.getByRole("button", { name: /resolve/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("not canChange: no Edit, Delete or Resolve", async () => {
    render(
      <OutdatedComments
        comments={[make({})]}
        numbers={numbers}
        card={cardFor()}
      />,
    );

    await userEvent.click(item(3));

    for (const name of [/edit/i, /delete/i, /resolve/i]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("clicking the open item closes it", async () => {
    render(
      <OutdatedComments
        comments={[make({})]}
        numbers={numbers}
        card={cardFor()}
      />,
    );

    await userEvent.click(item(3));
    expect(screen.getByRole("dialog")).toBeVisible();
    await userEvent.click(item(3));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(item(3)).toHaveAttribute("aria-expanded", "false");
  });

  it("an outside click on a focusable element keeps focus there", async () => {
    render(
      <>
        <input aria-label="Elsewhere" />
        <OutdatedComments
          comments={[make({})]}
          numbers={numbers}
          card={cardFor()}
        />
      </>,
    );

    await userEvent.click(item(3));
    await userEvent.click(screen.getByRole("textbox", { name: "Elsewhere" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("textbox", { name: "Elsewhere" })).toHaveFocus();
  });

  it("does not reopen a card when its comment leaves and returns", async () => {
    const props = { numbers, card: cardFor() };
    const { rerender } = render(
      <OutdatedComments comments={[make({})]} {...props} />,
    );
    await userEvent.click(item(3));
    rerender(<OutdatedComments comments={[]} {...props} />);
    rerender(<OutdatedComments comments={[make({})]} {...props} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
