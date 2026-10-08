import type { Page } from "playwright";
import type { AgentBrowser } from "./agent";

/**
 * The real browser for the demo agent (agent.ts), driven through Playwright.
 * Pages are read with Playwright's AI snapshot, the same accessibility
 * outline with element refs that Playwright MCP uses. The main page stays on
 * the demo site: off-site navigations are blocked or undone and new tabs are
 * closed. Embedded frames, like videos, still load their own content.
 */

const ACTION_TIMEOUT_MS = 10_000;
// The demo runs `next dev`, which compiles each page the first time it's opened
const NAVIGATION_TIMEOUT_MS = 90_000;
// After an action, wait at least this long (it covers debounced updates, like
// Explore's search mirroring its query into the URL after 300 ms), then until
// the page's own requests have been quiet for QUIET_MS
const MIN_SETTLE_MS = 600;
const QUIET_MS = 500;
const SETTLE_LIMIT_MS = 15_000;
// The requests that change what's on the page (not images, fonts or sockets)
const CONTENT_REQUESTS = new Set(["document", "fetch", "xhr", "script"]);
// Next's dev-only endpoints. One of them opens files in the developer's editor.
const DEV_ENDPOINTS = "/__nextjs";
// Off limits once the persona is logged in: logging out, logging in as
// someone else, and the demo's control routes
const BLOCKED_AFTER_LOGIN = [
  "/api/auth/signout",
  "/api/auth/callback/",
  "/auth/demo-link",
  "/api/demo/",
];

/** Page-controlled text for the agent's notes, quoted and kept short. */
function quote(text: string) {
  return JSON.stringify(text.length > 200 ? `${text.slice(0, 200)}...` : text);
}

/** The demo-site URL for an agent's go_to path. Anything off the site is refused. */
export function resolveDemoUrl(baseUrl: string, path: string) {
  const origin = new URL(baseUrl).origin;
  const url =
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
      ? new URL(path, origin)
      : null;
  if (!url || url.origin !== origin) {
    throw new Error(
      `go_to takes a path on the demo site, like /explore, not ${path}.`,
    );
  }
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith(DEV_ENDPOINTS)
  ) {
    throw new Error(
      `${url.pathname} is one of Next's internal paths, not a page.`,
    );
  }
  return url.toString();
}

/** Playwright's error, minus its call log, worded for the agent. */
export function actionError(error: unknown, elementRef?: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === "TimeoutError") {
    return elementRef
      ? `${elementRef} didn't respond within ${ACTION_TIMEOUT_MS / 1000} seconds. It may be hidden, disabled or covered, or the page changed since the last look.`
      : "The page didn't respond in time.";
  }
  if (message.includes("net::ERR_BLOCKED_BY_CLIENT")) {
    return "That page is off limits for agents.";
  }
  return message.split("\n")[0].replace(/^[\w.]+: /, "");
}

// Playwright's AI snapshot isn't in its public types (Playwright MCP uses
// it). Version 1.55 returns the text; newer ones may wrap it in `full`.
type SnapshotPage = Page & {
  _snapshotForAI?: () => Promise<string | { full: string }>;
};

export type LaunchOptions = {
  baseUrl: string;
  headless: boolean;
  /** "chrome" uses the installed Google Chrome; "chromium" needs `npx playwright install chromium`. */
  channel: string;
};

export async function launchAgentBrowser({
  baseUrl,
  headless,
  channel,
}: LaunchOptions) {
  const { chromium } = await import("playwright");
  const origin = new URL(baseUrl).origin;
  // Chrome doesn't need the agent's API key
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[0] !== "DEMO_AGENT_API_KEY" && entry[1] !== undefined,
    ),
  );
  const browser = await chromium.launch({
    headless,
    ...(channel === "chromium" ? {} : { channel }),
    env,
    // The runner handles Ctrl+C: it stops, saves the run's log and then closes the browser
    handleSIGINT: false,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: false,
  });
  const page = (await context.newPage()) as SnapshotPage;
  if (typeof page._snapshotForAI !== "function") {
    await browser.close();
    throw new Error(
      "This Playwright has no AI snapshot (page._snapshotForAI); the runner was built with Playwright 1.55.",
    );
  }
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  const notes: string[] = [];
  let loggedIn = false;

  await context.route("**/*", (route) => {
    const request = route.request();
    let url: URL | null = null;
    try {
      url = new URL(request.url());
    } catch {
      // Leave anything unparseable to the browser
    }
    const onSite = url?.origin === origin;
    if (onSite && url?.pathname.startsWith(DEV_ENDPOINTS)) {
      return route.abort("blockedbyclient");
    }
    if (
      loggedIn &&
      onSite &&
      BLOCKED_AFTER_LOGIN.some((path) => url?.pathname.startsWith(path))
    ) {
      notes.push(
        "Logging out, or in as someone else, is turned off for agents.",
      );
      return route.abort("blockedbyclient");
    }
    let offSiteNavigation = false;
    try {
      offSiteNavigation =
        !onSite &&
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame();
    } catch {
      // Service worker requests have no frame
    }
    if (offSiteNavigation) {
      notes.push(
        `A link to ${quote(request.url())} leaves the demo site, so it was blocked.`,
      );
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  context.on("page", (popup) => {
    notes.push(
      "A link tried to open a new tab, which was closed. Use go_to for pages on this site.",
    );
    popup.close().catch(() => {});
  });
  page.on("dialog", (dialog) => {
    const kind = dialog.type();
    notes.push(
      `${/^[aeiou]/.test(kind) ? "An" : "A"} ${kind} dialog on the page said ${quote(dialog.message())}, and it was accepted.`,
    );
    dialog.accept().catch(() => {});
  });

  // Playwright's "networkidle" only covers full page loads, and Next moves
  // between pages without one, so the page's requests are counted here
  let inFlight = 0;
  let lastActivity = Date.now();
  page.on("request", (request) => {
    if (!CONTENT_REQUESTS.has(request.resourceType())) return;
    inFlight++;
    lastActivity = Date.now();
  });
  const finished = (request: { resourceType(): string }) => {
    if (!CONTENT_REQUESTS.has(request.resourceType())) return;
    inFlight = Math.max(0, inFlight - 1);
    lastActivity = Date.now();
  };
  page.on("requestfinished", finished);
  page.on("requestfailed", finished);

  // settle() brings the agent back when the main page ends up off the site:
  // Chrome's error page after a blocked or failed load, or a redirect
  let lastDemoUrl: string | null = null;
  let failedLoad: { url: string; error: string } | null = null;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && frame.url().startsWith(`${origin}/`)) {
      lastDemoUrl = frame.url();
    }
  });
  page.on("requestfailed", (request) => {
    try {
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      ) {
        failedLoad = {
          url: request.url(),
          error: request.failure()?.errorText ?? "failed",
        };
      }
    } catch {
      // Service worker requests have no frame
    }
  });
  const onDemoSite = () => page.url().startsWith(`${origin}/`);

  const element = (elementRef: string) =>
    page.locator(`aria-ref=${elementRef}`);
  // Lets a click's navigation or re-render land before the next snapshot
  async function settle(recovering = false): Promise<void> {
    const deadline = Date.now() + SETTLE_LIMIT_MS;
    await page.waitForTimeout(MIN_SETTLE_MS);
    while (
      Date.now() < deadline &&
      (inFlight > 0 || Date.now() - lastActivity < QUIET_MS)
    ) {
      await page.waitForTimeout(100);
    }
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    if (recovering || onDemoSite()) return;

    const where = page.url();
    if (!where.startsWith("chrome-error://")) {
      notes.push(
        `The page went to ${quote(where)}, outside the demo site, so the browser went back.`,
      );
    } else if (
      failedLoad &&
      failedLoad.error !== "net::ERR_BLOCKED_BY_CLIENT"
    ) {
      // Blocked links already have a note
      notes.push(
        `Opening ${quote(failedLoad.url)} failed (${failedLoad.error}), so the browser went back.`,
      );
    }
    failedLoad = null;
    await page.goBack().catch(() => null);
    if (!onDemoSite() && lastDemoUrl) {
      await page.goto(lastDemoUrl).catch(() => null);
    }
    await settle(true);
  }
  async function act(
    elementRef: string | undefined,
    action: () => Promise<unknown>,
  ) {
    let failure: unknown = null;
    try {
      await action();
    } catch (error) {
      failure = error;
    }
    // Even after a failure, so a blocked page load is undone
    await settle();
    if (failure) throw new Error(actionError(failure, elementRef));
  }
  async function snapshot() {
    const result = await page._snapshotForAI!();
    return typeof result === "string" ? result : result.full;
  }

  const agentBrowser: AgentBrowser = {
    async view() {
      let text: string;
      try {
        text = await snapshot();
      } catch {
        // Usually a navigation in progress
        await settle();
        text = await snapshot();
      }
      return {
        url: page.url(),
        title: await page.title().catch(() => ""),
        snapshot: text,
        notes: notes.splice(0),
      };
    },
    click: (elementRef) => act(elementRef, () => element(elementRef).click()),
    type: (elementRef, text, submit) =>
      act(elementRef, async () => {
        await element(elementRef).fill(text);
        if (submit) await element(elementRef).press("Enter");
      }),
    selectOption: (elementRef, values) =>
      act(elementRef, () => element(elementRef).selectOption(values)),
    pressKey: (key) => act(undefined, () => page.keyboard.press(key)),
    goTo: (path) =>
      act(undefined, () => page.goto(resolveDemoUrl(baseUrl, path))),
    goBack: () => act(undefined, () => page.goBack()),
    wait: (seconds) =>
      act(undefined, () => page.waitForTimeout(seconds * 1000)),
  };

  return {
    agentBrowser,
    /** Opens a one-time login link and waits until it has logged the persona in. */
    async logIn(loginUrl: string) {
      await page.goto(loginUrl);
      const refused = page.getByRole("alert").filter({ hasText: "login link" });
      const result = await Promise.race([
        page
          .waitForURL((url) => url.pathname !== "/auth/demo-link")
          .then(
            () => "logged in",
            () => "timed out",
          ),
        refused.waitFor({ timeout: NAVIGATION_TIMEOUT_MS }).then(
          () => "refused",
          () => "timed out",
        ),
      ]);
      if (result === "refused") {
        const alert = await refused.innerText().catch(() => "");
        throw new Error(
          `The login link didn't work: ${alert.trim().replace(/\s*\n\s*/g, ". ")}`,
        );
      }
      if (result !== "logged in") throw new Error("Logging in timed out.");
      await settle();
      notes.length = 0;
      loggedIn = true;
    },
    close: () => browser.close(),
  };
}
