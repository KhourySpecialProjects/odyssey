import { render, screen } from "@testing-library/react";
import { commentTime } from "@/lib/review-comments";
import { AwaitingReplyList } from "@/components/review/awaiting-reply-list";

const row = (over = {}) => ({
  dropletId: 1,
  name: "Intro to Git",
  slug: "intro-to-git",
  threads: 1,
  lastReplyAt: "2026-01-01T12:00:00.000Z",
  ...over,
});

describe("AwaitingReplyList", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<AwaitingReplyList rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links a row to the draft with its thread count", () => {
    render(<AwaitingReplyList rows={[row()]} />);
    expect(
      screen.getByRole("heading", { name: "Waiting on you" }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/draft/d/intro-to-git");
    expect(link).toHaveTextContent("Intro to Git");
    expect(link).toHaveTextContent("1 thread waiting on you");
    expect(link).toHaveTextContent("Last reply");
  });

  it("shows the reply time after mount, with the ISO string as dateTime", () => {
    const { container } = render(<AwaitingReplyList rows={[row()]} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-01-01T12:00:00.000Z");
    expect(time?.textContent).toBe(commentTime("2026-01-01T12:00:00.000Z"));
    expect(time?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it("pluralises threads and omits the time when unknown", () => {
    render(
      <AwaitingReplyList rows={[row({ threads: 2, lastReplyAt: null })]} />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("2 threads waiting on you");
    expect(link).not.toHaveTextContent("Last reply");
  });
});
