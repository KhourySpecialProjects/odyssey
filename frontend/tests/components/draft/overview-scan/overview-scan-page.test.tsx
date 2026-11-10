import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewScanPage } from "@/components/draft/overview-scan/overview-scan-page";
import {
  dismissScanFlag,
  runOverviewScan,
  undoScanFlagDismissal,
} from "@/lib/requests/overview-scan";
import { RULES_VERSION } from "@/lib/overview-scan/config";
import { buildScanView, type ScanView } from "@/lib/overview-scan/view";
import type { Check, OverviewScan } from "@/lib/overview-scan/types";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: jest.fn() }),
  usePathname: () => "/draft/d/s/scan",
}));
jest.mock("@/lib/requests/overview-scan");
const mockedRun = runOverviewScan as jest.MockedFunction<
  typeof runOverviewScan
>;

const CHECKS: Check[] = [
  ["c1", "content"],
  ["s1", "structure"],
  ["s2", "structure"],
].map(([id, group]) => ({
  id,
  group: group as Check["group"],
  title: `Check ${id}`,
  description: "d",
  scope: "s",
  rules: [{ id: "a", text: "Rule a", run: () => [] }],
}));
// The first check has a second rule, so rule and check counts differ.
CHECKS[0].rules = [
  ...CHECKS[0].rules,
  { id: "b", text: "Rule b", run: () => [] },
];
const RULE_COUNT = CHECKS.reduce((n, c) => n + c.rules.length, 0);

const saved = (overrides: Partial<OverviewScan> = {}): OverviewScan => ({
  id: 1,
  ranAt: new Date().toISOString(),
  rulesVersion: RULES_VERSION,
  passed: 1,
  needsAttention: 1,
  couldNotCheck: 1,
  ranBy: { id: 1, firstName: "Ada", lastName: "Lovelace" },
  results: [
    {
      id: "c1",
      status: "pass",
      rules: [
        { id: "a", status: "pass", flags: [] },
        { id: "b", status: "pass", flags: [] },
      ],
    },
    {
      id: "s1",
      status: "warn",
      rules: [{ id: "a", status: "warn", flags: [] }],
    },
    {
      id: "s2",
      status: "unknown",
      rules: [{ id: "a", status: "unknown", flags: [] }],
    },
  ],
  ...overrides,
});

const viewOf = (scan: OverviewScan | null): ScanView =>
  buildScanView({ checks: CHECKS, scan, lessons: [], slug: "s" });

const renderPage = (view = viewOf(null), loadError = false) =>
  render(
    <OverviewScanPage
      dropletId={7}
      dropletName="Drop"
      slug="drop"
      lessonCount={2}
      view={view}
      loadError={loadError}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe("OverviewScanPage", () => {
  it("shows a droplet that was never scanned", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: "Run checks" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not run yet")).toHaveLength(1 + CHECKS.length);
    expect(screen.queryByText(/passed/)).toBeNull();
    expect(
      screen.getByText("Drop · 3 checks across the droplet page and 2 lessons"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No checks in this column yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to draft" })).toHaveAttribute(
      "href",
      "/draft/d/drop",
    );
    expect(
      screen.getByText(`Rules version ${RULES_VERSION} · ${RULE_COUNT} rules`),
    ).toBeInTheDocument();
  });

  it("shows the pills, who ran it and each row's word", () => {
    renderPage(viewOf(saved()));
    expect(document.body).toHaveTextContent(
      /Last scanned Today, .* by Ada Lovelace/,
    );
    expect(screen.getByText("1 passed")).toBeInTheDocument();
    expect(screen.getByText("1 need attention")).toBeInTheDocument();
    expect(screen.getByText("1 couldn't check")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Check s1.*Needs attention/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run again" }),
    ).toBeInTheDocument();
  });

  it.each([
    [true, 1],
    [false, 0],
  ])("with editedSince %s shows the note %i times", (editedSince, count) => {
    renderPage({ ...viewOf(saved()), editedSince });
    expect(screen.queryAllByText(/Edited since the last scan/)).toHaveLength(
      count,
    );
  });

  it("shows the checks-changed note and the load error", () => {
    renderPage(viewOf(saved({ rulesVersion: "old" })), true);
    expect(
      screen.getByText(/The checks changed since this scan/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't load the last scan."),
    ).toBeInTheDocument();
  });

  it("disables the button and announces while running", async () => {
    mockedRun.mockReturnValue(new Promise(() => {}));
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Run checks" }));
    expect(
      await screen.findByRole("button", { name: "Running…" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      `Running ${CHECKS.length} checks.`,
    );
    expect(screen.getAllByText("Checking")).toHaveLength(CHECKS.length);
    expect(
      screen.getByText(`Checking ${CHECKS.length} checks`),
    ).toBeInTheDocument();
  });

  it.each([
    ["forbidden", undefined, /Only reviewers/],
    ["rate_limited", "Wait 5 minutes.", /Wait 5 minutes\./],
    ["rate_limited", undefined, /10 times this hour/],
    ["failed", undefined, /couldn't run/],
  ] as const)("shows %s in the alert", async (error, message, text) => {
    mockedRun.mockResolvedValue({ ok: false, error, data: null, message });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Run checks" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the failure alert when the action throws", async () => {
    mockedRun.mockRejectedValue(new Error("boom"));
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Run checks" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't run/);
  });

  it("runs once when the button is clicked twice", async () => {
    mockedRun.mockReturnValue(new Promise(() => {}));
    renderPage();
    const button = screen.getByRole("button", { name: "Run checks" });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(mockedRun).toHaveBeenCalledTimes(1);
  });

  describe("announcing a finished run", () => {
    const OLD = "2026-11-01T10:00:00.000Z";
    const NEW = "2026-11-03T10:00:00.000Z";
    const FINISHED =
      "Checks finished: 1 passed, 1 need attention, 1 couldn't check.";
    const page = (view: ScanView) => (
      <OverviewScanPage
        dropletId={7}
        dropletName="Drop"
        slug="drop"
        lessonCount={2}
        view={view}
      />
    );
    const start = async (deferred: Promise<never> | Promise<unknown>) => {
      mockedRun.mockReturnValue(deferred as ReturnType<typeof runOverviewScan>);
      const utils = render(page(viewOf(saved({ ranAt: OLD }))));
      await userEvent.click(screen.getByRole("button", { name: "Run again" }));
      return utils;
    };

    it("announces when the new scan arrives before the action resolves", async () => {
      let resolve!: (r: unknown) => void;
      const { rerender } = await start(new Promise((r) => (resolve = r)));
      await act(async () => {
        rerender(page(viewOf(saved({ ranAt: NEW }))));
      });
      expect(screen.getByRole("status")).toHaveTextContent(FINISHED);

      await act(async () => {
        resolve({ ok: true, error: null, data: saved({ ranAt: NEW }) });
      });
      expect(refresh).toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent(FINISHED);
      expect(
        screen.getByRole("button", { name: "Run again" }),
      ).toBeInTheDocument();

      // A later scan with other counts is not announced.
      await act(async () => {
        rerender(
          page(
            viewOf(
              saved({
                ranAt: "2026-11-03T11:00:00.000Z",
                results: saved().results.slice(0, 1),
              }),
            ),
          ),
        );
      });
      expect(screen.getByRole("status")).toHaveTextContent(FINISHED);
    });

    it("ignores a refresh that still carries the old scan", async () => {
      const { rerender } = await start(new Promise(() => {}));
      await act(async () => {
        rerender(page(viewOf(saved({ ranAt: OLD }))));
      });
      expect(screen.getByRole("status")).not.toHaveTextContent(
        /Checks finished/,
      );
    });
  });
});

describe("OverviewScanPage, dismissing flags (ODY-905)", () => {
  const mockedDismiss = dismissScanFlag as jest.MockedFunction<
    typeof dismissScanFlag
  >;
  const mockedUndo = undoScanFlagDismissal as jest.MockedFunction<
    typeof undoScanFlagDismissal
  >;
  const FLAG = {
    partId: "droplet",
    blockId: "overview",
    message: "Too short.",
  };
  const KEY = { checkId: "s1", ruleId: "a", ...FLAG };
  // s1 needs attention from one flag on the droplet page
  const flagged = () =>
    viewOf(
      saved({
        results: saved().results.map((c) =>
          c.id === "s1"
            ? {
                ...c,
                rules: [
                  {
                    id: "a",
                    status: "warn",
                    flags: [{ ...FLAG, severity: "warn" }],
                  },
                ],
              }
            : c,
        ),
      }),
    );
  const renderWith = (
    props: Partial<Parameters<typeof OverviewScanPage>[0]> = {},
  ) =>
    render(
      <OverviewScanPage
        dropletId={7}
        dropletName="Drop"
        slug="drop"
        lessonCount={2}
        view={flagged()}
        canDismiss
        {...props}
      />,
    );
  const openS1 = () =>
    userEvent.click(screen.getByRole("button", { name: /^Check s1/ }));
  const dismissButton = () =>
    screen.getByRole("button", {
      name: /^Dismiss\s*: Droplet page · Overview$/,
    });
  const undoButton = () =>
    screen.getByRole("button", {
      name: /^Undo\s*: dismissing Droplet page · Overview$/,
    });

  it("moves the check to passed at once, then saves and refreshes", async () => {
    let resolve!: (r: Awaited<ReturnType<typeof dismissScanFlag>>) => void;
    mockedDismiss.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWith();
    await openS1();

    await userEvent.click(dismissButton());

    expect(screen.queryByText("1 need attention")).toBeNull();
    expect(screen.getByText("2 passed")).toBeInTheDocument();
    expect(screen.getByText(/^Dismissed by You/)).toBeInTheDocument();
    expect(undoButton()).toHaveFocus();
    expect(mockedDismiss).toHaveBeenCalledWith(7, KEY);
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => resolve({ ok: true, error: null, data: null }));
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Flag dismissed.");
  });

  it.each([
    [
      "it fails",
      { ok: false, error: "failed", data: null },
      "That didn't save. Try again.",
    ],
    [
      "the droplet went into review",
      { ok: false, error: "in_review", data: null },
      "In review. Editing is paused until the reviewer sends it back.",
    ],
    [
      "the flag changed",
      { ok: false, error: "stale", data: null },
      "This flag changed since the page loaded. Run checks again or reload the page.",
    ],
  ] as const)(
    "puts the flag back and says why when %s",
    async (_, result, message) => {
      mockedDismiss.mockResolvedValue(result);
      renderWith();
      await openS1();

      await userEvent.click(dismissButton());

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByText("1 need attention")).toBeInTheDocument();
      expect(dismissButton()).toHaveFocus();
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("brings a dismissed flag back with Undo", async () => {
    mockedUndo.mockResolvedValue({ ok: true, error: null, data: null });
    renderWith({
      dismissals: [
        {
          ...KEY,
          dismissedBy: "Grace Hopper",
          dismissedAt: new Date().toISOString(),
        },
      ],
    });
    expect(screen.getByText("2 passed")).toBeInTheDocument();
    await openS1();
    expect(screen.getByText(/^Dismissed by Grace Hopper/)).toBeInTheDocument();

    await userEvent.click(undoButton());

    expect(screen.getByText("1 need attention")).toBeInTheDocument();
    expect(dismissButton()).toHaveFocus();
    expect(mockedUndo).toHaveBeenCalledWith(7, KEY);
    expect(await screen.findByText("Flag restored.")).toBeInTheDocument();
  });

  it("says dismissing is paused for someone who can't dismiss", async () => {
    renderWith({ canDismiss: false });
    expect(
      screen.getByText(
        "Dismissing flags is paused while this droplet is in review.",
      ),
    ).toBeInTheDocument();
    await openS1();
    expect(screen.queryByRole("button", { name: /^Dismiss/ })).toBeNull();
  });

  it("says when the dismissed flags couldn't load", () => {
    renderWith({ canDismiss: false, dismissalsError: true });
    expect(
      screen.getByText("Couldn't load the dismissed flags."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/is paused/)).toBeNull();
  });
});
