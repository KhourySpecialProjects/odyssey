import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckRow } from "@/components/draft/overview-scan/check-row";
import { flagKeyId } from "@/lib/overview-scan/view";
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

describe("CheckRow, dismissing flags (ODY-905)", () => {
  const onDismiss = jest.fn();
  const onUndo = jest.fn();
  // Every flag of the warning rule dismissed, as applyDismissals leaves it
  const allDismissed = (): CheckView => {
    const base = checkView();
    const rule = base.rules[1];
    return {
      ...base,
      status: "pass",
      flagCount: 0,
      dismissedCount: 1,
      rules: [
        base.rules[0],
        {
          ...rule,
          status: "pass",
          flags: [],
          dismissed: [
            {
              ...lessonFlag,
              dismissedBy: "Ada Lovelace",
              dismissedAt: "2026-11-09T10:00:00.000Z",
            },
          ],
        },
      ],
    };
  };
  const renderWith = (
    check: CheckView,
    { canDismiss = true, running = false, pending = [] as string[] } = {},
  ) =>
    render(
      <ul>
        <CheckRow
          check={check}
          running={running}
          canDismiss={canDismiss}
          pendingKeys={new Set(pending)}
          onDismiss={onDismiss}
          onUndo={onUndo}
        />
      </ul>,
    );
  const open = () =>
    userEvent.click(screen.getByRole("button", { expanded: false }));

  beforeEach(() => jest.clearAllMocks());

  it("gives every flag a Dismiss button that sends its key", async () => {
    renderWith(checkView());
    await open();

    expect(screen.getAllByRole("button", { name: /^Dismiss/ })).toHaveLength(2);
    await userEvent.click(
      screen.getByRole("button", { name: /^Dismiss\s*: Lesson 2 · Second$/ }),
    );
    expect(onDismiss).toHaveBeenCalledWith(KEY);
  });

  it("lists a dismissed flag greyed, with who dismissed it and Undo", async () => {
    renderWith(allDismissed());
    await open();

    expect(
      screen.getByText(/^Dismissed by Ada Lovelace · /),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", {
        name: /^Undo\s*: dismissing Lesson 2 · Second$/,
      }),
    );
    expect(onUndo).toHaveBeenCalledWith(KEY);
    expect(screen.queryByRole("button", { name: /^Dismiss/ })).toBeNull();
  });

  it("says Passed and how many are dismissed in the row's name", () => {
    renderWith(allDismissed());
    expect(
      screen.getByRole("button", {
        name: /^Organization\s*, Passed\s*, 1 dismissed$/,
      }),
    ).toBeInTheDocument();
  });

  it("shows no Dismiss or Undo when the caller can't dismiss", async () => {
    renderWith(allDismissed(), { canDismiss: false });
    await open();
    expect(
      screen.queryByRole("button", { name: /^(Dismiss|Undo)/ }),
    ).toBeNull();
    expect(screen.getByText(/^Dismissed by Ada Lovelace/)).toBeInTheDocument();
  });

  it.each([
    ["a scan is running", { running: true }],
    ["that flag is saving", { pending: [flagKeyId(KEY)] }],
  ])("disables the button while %s", async (_, options) => {
    renderWith(checkView(), options);
    await open();
    const button = screen.getByRole("button", {
      name: /^Dismiss\s*: Lesson 2 · Second$/,
    });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
