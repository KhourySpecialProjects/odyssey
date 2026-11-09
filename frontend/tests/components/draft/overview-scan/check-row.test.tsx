import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckRow } from "@/components/draft/overview-scan/check-row";
import type { CheckView, FlagView } from "@/lib/overview-scan/view";

const KEY = {
  checkId: "org",
  ruleId: "w",
  partId: "12",
  blockId: "b1",
  message: "Too long",
};

const lessonFlag: FlagView = {
  key: KEY,
  label: "Lesson 2 · Second",
  message: "Too long",
  severity: "warn",
  href: "/draft/d/drop/second",
  linkText: "Go to lesson",
};

const checkView = (overrides: Partial<CheckView> = {}): CheckView => ({
  id: "org",
  title: "Organization",
  description: "Is it organized?",
  scope: "Every lesson",
  status: "warn",
  savedStatus: "warn",
  flagCount: 2,
  dismissedCount: 0,
  note: "A note.",
  rules: [
    {
      id: "p",
      text: "Passing rule",
      status: "pass",
      savedStatus: "pass",
      flags: [],
      dismissed: [],
    },
    {
      id: "w",
      text: "Warning rule",
      status: "warn",
      savedStatus: "warn",
      flags: [
        lessonFlag,
        {
          ...lessonFlag,
          key: { ...KEY, partId: "99" },
          label: "Deleted lesson",
          href: null,
          linkText: null,
        },
      ],
      dismissed: [],
    },
  ],
  ...overrides,
});

const renderRow = (check = checkView(), running = false) =>
  render(
    <ul>
      <CheckRow check={check} running={running} />
    </ul>,
  );

describe("CheckRow", () => {
  it.each([
    [
      "2 flags",
      checkView(),
      false,
      /^Organization\s*, Needs attention\s*, 2 flags$/,
    ],
    [
      "1 flag",
      checkView({ flagCount: 1 }),
      false,
      /^Organization\s*, Needs attention\s*, 1 flag$/,
    ],
    [
      "passed, no flags",
      checkView({ status: "pass", flagCount: 0 }),
      false,
      /^Organization\s*, Passed$/,
    ],
    [
      "not run",
      checkView({ status: "not-run", flagCount: 0 }),
      false,
      /^Organization\s*, Not run yet$/,
    ],
    ["running", checkView(), true, /^Organization\s*, Checking$/],
  ])(
    "names the button with title, status and flags: %s",
    (_n, check, running, name) => {
      renderRow(check, running);
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    },
  );

  it.each([
    ["click", async () => userEvent.click(screen.getByRole("button"))],
    [
      "Enter",
      async () => userEvent.tab().then(() => userEvent.keyboard("{Enter}")),
    ],
    ["Space", async () => userEvent.tab().then(() => userEvent.keyboard(" "))],
  ])("toggles on %s", async (_n, act) => {
    renderRow();
    await act();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("hides its details with no display class, so [hidden] isn't overridden", async () => {
    renderRow();
    const button = screen.getByRole("button");
    const details = document.getElementById(
      button.getAttribute("aria-controls")!,
    )!;
    expect(details).toHaveAttribute("hidden");
    expect(details.className).not.toMatch(/(^|\s)(flex|grid|block)(\s|$)/);

    await userEvent.click(button);
    expect(details).not.toHaveAttribute("hidden");

    await userEvent.click(button);
    expect(details).toHaveAttribute("hidden");
    expect(details.className).not.toMatch(/(^|\s)(flex|grid|block)(\s|$)/);
  });

  it("shows the rules in order with flags, a link and the note", async () => {
    renderRow();
    await userEvent.click(screen.getByRole("button"));
    const rules = screen.getAllByText(/ rule/).map((e) => e.textContent);
    expect(rules).toEqual([
      "Passing rule (Passed)",
      "Warning rule (Needs attention)",
    ]);
    expect(screen.getByText("Looks at: Every lesson")).toBeInTheDocument();
    expect(screen.getByText("A note.")).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /^Go to lesson\s*: Lesson 2 · Second$/,
    });
    expect(link).toHaveAttribute("href", "/draft/d/drop/second");
    const deleted = screen.getByText("Deleted lesson").closest("li")!;
    expect(within(deleted).queryByRole("link")).toBeNull();
  });
});
